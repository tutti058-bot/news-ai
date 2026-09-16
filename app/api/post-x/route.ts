import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanText(value: unknown): string {
  if (typeof value !== "string") {
    return String(value ?? "");
  }

  let text = value.trim();

  // コードブロック除去
  text = text
    .replace(/^```(?:json|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // JSON文字列が残っている場合に可能な限り展開
  for (let i = 0; i < 2; i++) {
    try {
      const parsed = JSON.parse(text);

      if (typeof parsed === "string") {
        text = parsed.trim();
        continue;
      }

      if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;

        const candidates = [
          obj.hook,
          obj.description,
          obj.result,
          obj.response,
          obj.content,
          obj.text,
          obj.message,
        ];

        const found = candidates.find(
          (v): v is string =>
            typeof v === "string" && v.trim().length > 0
        );

        if (found) {
          text = found.trim();
          continue;
        }
      }
    } catch {
      // 通常の文章
    }

    break;
  }

  // JSON風文字列を除去
  text = text
    .replace(
      /^\s*\{\s*["'](?:result|response|content|text|message|hook|description)["']\s*:\s*["']([\s\S]*?)["']\s*\}\s*$/i,
      "$1"
    )
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*#+\s*/gm, "")
    .trim();

  return text;
}

function cleanHook(value: unknown): string {
  let text = cleanText(value)
    .replace(/^「|」$/g, "")
    .replace(/でやんす[。！!]?$/g, "")
    .trim();

  // JSON風の外側が残った場合
  text = text
    .replace(/^\s*\{\s*["'][^"']*["']\s*:\s*["']?/g, "")
    .replace(/["']\s*\}\s*$/g, "")
    .trim();

  return text;
}

function cleanDescription(value: unknown): string {
  let text = cleanText(value)
    .replace(/^「|」$/g, "")
    .replace(/でやんす[。！!]?$/g, "")
    .trim();

  // JSON風の外側が残った場合
  text = text
    .replace(/^\s*\{\s*["'][^"']*["']\s*:\s*["']?/g, "")
    .replace(/["']\s*\}\s*$/g, "")
    .trim();

  const strongEnding =
    /[！!]\s*$/.test(text) ||
    /(大きな|劇的|快挙|決定|逆転|優勝|突破|初|注目|期待|衝撃)/.test(text);

  text = text.replace(/[。！!]+$/g, "").trim();

  return `${text}${strongEnding ? "でやんす！" : "でやんす。"}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const newsId = Number(body.newsId);

    if (!newsId) {
      return NextResponse.json(
        {
          error: "newsIdが必要です",
        },
        { status: 400 }
      );
    }

    const news = await prisma.news.findUnique({
      where: {
        id: newsId,
      },
    });

    if (!news) {
      return NextResponse.json(
        {
          error: "記事がありません",
        },
        { status: 404 }
      );
    }

    const url = `https://tutti-news-ai-bay.vercel.app/news/${news.id}`;
    const score = news.score ?? 60;

    // AI画像版は同じ画像で「通常版」と「独自分析版」の2種類を生成
    if (body.mode === "ai-image") {
      const imageResponse =
        await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: `
AI NEWSジャパンのAI画像付きX投稿を作成してください。

今回は「通常版」と「AI NEWSジャパン独自分析版」の2種類を作成します。

JSONのみ返してください。

{
  "hook": "何が起きたかを示す1行",
  "attention": "なぜ今注目なのか",
  "scoreReason": "AI NEWS評価の理由",
  "future": "記事から確認できる今後の動きや変化",
  "independentAnalysis": "AI NEWSジャパン独自の具体的な見方"
}

【hook】
短いフック＋タイトル。

基本形：
新展開【タイトル】
速報【タイトル】
話題【タイトル】
注目【タイトル】

ニュース内容に合うフックを選ぶ。
毎回同じフックにしない。
不要ならタイトルだけでもよい。

重要：
「【速報】タイトル」の形でもよいが、
hook全体をさらに【】で囲まない。
「【【速報】タイトル】」は禁止。

できるだけ
フック【タイトル】
の形にする。

タイトルは元記事の意味を変えない。

【content】
タイトルの内容をそのまま繰り返すのではなく、
タイトルだけでは分からない具体的な情報を補足する。

優先する情報：
・料金
・対応機能
・サービスの仕組み
・利用方法
・対象者
・具体的な数字
・今回の記事で特に重要な特徴

タイトルにすでに含まれている情報を、
別の言葉に言い換えて繰り返すだけの文章は禁止。

例えば、

タイトル：
「大阪駅に仕事もメイクもできる新駅ナカ空間 15分200円から」

悪い例：
「JR大阪駅に仕事やメイクができる空間が開業する。」

これはタイトルとほぼ同じなので禁止。

良い例：
「ninareruは仕事やメイク、ヘアセットに対応し、15分200円から短時間で利用できる。」

このように、タイトルを見ただけでは分からない具体情報を補足する。

35〜80文字程度。
記事にない事実、数字、人物情報、推測は禁止。
です・ますは禁止。
でやんす禁止。
自然な常体にする。
URLは禁止。

【analysisLabel】
独自分析の内容に合った短い見出しを1つ選ぶ。

例：
・今後の予想
・この先の流れ
・結果・その後
・AI NEWSジャパンの見方
・業界への影響
・次に起きそうなこと
・今後の焦点
・クリエイターへの影響
・企業への影響

ニュースによって最も自然な見出しを自分で判断する。
毎回同じ見出しにしない。
5〜15文字程度。
「▼」は付けない。

【analysis】
ここがAI NEWSジャパン独自版の核心。

この文章では、ニュースの内容を説明してはいけない。
ニュースによって「この先、何が変わるのか」を具体的に書く。

まずニュースを見て、次の「変化の型」の中から最も自然なものを1つ選ぶ。

・試すだけ → 実際の仕事や制作で使う
・専門家中心 → 一般ユーザーにも実用化する
・高コスト → 低コストになり利用方法が変わる
・時間がかかる → 短時間で実現できる
・専門知識が必要 → 少ない知識でも使える
・補助的に使う → 制作や業務の工程に組み込まれる
・選択肢が少ない → 複数から比較して選ぶようになる
・既存の方法中心 → 新しい方法が現実的な選択肢になる
・サービスの進化 → 利用者の行動が変わる
・企業の新サービス → 競争条件や選ばれ方が変わる

そのうえで必ず、

「今まで○○だった」
→「このニュースによって△△が現実的になる」
→「その結果、□□する人や企業が増える可能性がある」

という順番で考える。

【最重要】

「無料になる」
「性能が上がる」
「便利になる」
「普及しそう」
だけで終わってはいけない。

それによって、
「何をする人が増えるのか」
「何をしなくてよくなるのか」
「どういう使い方が現実的になるのか」
「何を選ぶ基準が変わるのか」
まで一段踏み込む。

特に分析の最後は、
「多様な表現が増える」
「利用者が増える」
「市場が広がる」
のような抽象的な効果で締めない。

最後まで、
「誰が、何を、どう使うようになるのか」
という具体的な変化を書く。

例えば音楽生成AIなら、

弱い：
「音楽制作の敷居が下がり、多様な表現が増えそう。」

強い：
「個人でも試作だけでなく、実際の楽曲制作にAIを組み込みやすくなる。」

このように、結果ではなく「使い方の変化」を優先する。

例えば無料の高性能な音楽生成AIなら、

禁止：
「無料で高品質な音楽制作環境が手に入る。」

禁止：
「音楽生成AIの利用が広がりそう。」

推奨：
「無料でここまでの性能が出てくると、音楽生成AIは『試してみるもの』から『制作現場で使うもの』へ一気に変わりそう。日本語ボーカル対応も含め、個人クリエイターとプロの制作環境の差を縮める可能性がある。」

このように「サービスがすごい」ではなく、
「使われ方が変わる」
ところまで書く。

【文章構造】

第1文：
「今まで」と比べて何が変わるのかを書く。

第2文：
その変化によって、誰の行動・制作・仕事・選択肢がどう変わるのかを書く。

必要なら第3文：
その変化が周辺にどう波及するかを書く。

【禁止】

・タイトルの言い換え
・contentの言い換え
・ニュースの事実だけを書く
・「普及が加速しそう」で終わる
・「影響が大きそう」で終わる
・「環境が変わりそう」で終わる
・「市場が拡大しそう」で終わる
・抽象的な感想
・根拠のない断定
・記事にない数字、人物、企業動向の創作
・「注目です」「すごいですね」「今後に期待です」
・同じ結論を毎回使う

【品質チェック】

完成したanalysisを内部で確認し、

1. ニュースの要約になっていないか
2. 「何が変わるか」が具体的に書かれているか
3. 「誰の行動がどう変わるか」が最低1つ入っているか
4. 「普及する」「影響がある」「環境が変わる」だけで終わっていないか
5. 「今まで → これから」の変化が読み取れるか
6. 文章の中に、具体的な利用場面・行動・選択の変化が入っているか
7. 最後の一文が抽象論ではなく、具体的な行動や利用方法の変化になっているか
8. 文が最後まで完結しているか

特に3と6は必須。

例えば、

NG：
「駅ナカサービスの質が向上し、利用頻度が高まりそう。」

これは抽象論なので不合格。

OK：
「駅での空き時間を『待つ時間』ではなく、仕事や身支度を済ませる時間として使う人が増えそう。」

このように、誰が何をするようになるのかを具体的に書く。

analysisを完成させる前に、
「具体的に誰が、何をするようになる？」
への答えが文章内に存在するか確認する。

答えが存在しない場合は書き直す。



60〜110文字程度。
2〜3文。
必ず完結した文で終わる。
文の途中で終了しない。
自然な日本語。
です・ます禁止。
でやんす禁止。
URL禁止。

【内部チェック】

analysisを書く前に必ず、

「このニュースで、今までと何が変わる？」
「その変化で、誰の行動がどう変わる？」
「ニュース本文だけでは分からない一歩先は何？」

を考える。

この3つに明確な答えがない場合は、
単なる「影響がありそう」という抽象論を書かず、
ニュースから読み取れる別の具体的な変化を探す。

独自分析は、
「ニュースの説明」ではなく「ニュースの先に起きる変化」を書く。

JSONのみ返してください。

`,
            },
            {
              role: "user",
              content: `
タイトル：
${news.title}

要約：
${news.summary ?? ""}

カテゴリ：
${news.category ?? "国内"}
`,
            },
          ],
          temperature: 0.8,
          max_tokens: 600,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "x_image_post",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  hook: {
                    type: "string",
                  },
                  attention: {
                    type: "string",
                  },
                  scoreReason: {
                    type: "string",
                  },
                  future: {
                    type: "string",
                  },
                },
                required: [
                  "hook",
                  "attention",
                  "scoreReason",
                  "future",
                ],
                additionalProperties: false,
              },
            },
          },
        });

      const rawImageContent =
        imageResponse.choices[0]?.message?.content?.trim() ?? "";

      let imagePost: {
        hook: string;
        attention: string;
        scoreReason: string;
        future: string;
      };

      try {
        imagePost = JSON.parse(rawImageContent);
      } catch {
        throw new Error(
          "AI画像版X投稿の解析に失敗しました"
        );
      }

      const imageHook = cleanText(imagePost.hook)
        .replace(/追加情報はリプへ👇/g, "")
        .replace(/^「|」$/g, "")
        .trim();

      const imageAttention = cleanText(
        imagePost.attention
      )
        .replace(/追加情報はリプへ👇/g, "")
        .replace(/でやんす[。！!]?$/gi, "")
        .trim();

      const imageScoreReason = cleanText(
        imagePost.scoreReason
      )
        .replace(/追加情報はリプへ👇/g, "")
        .replace(/でやんす[。！!]?$/gi, "")
        .trim();

      const imageFuture = cleanText(
        imagePost.future
      )
        .replace(/追加情報はリプへ👇/g, "")
        .replace(/でやんす[。！!]?$/gi, "")
        .trim();

      if (
        !imageHook ||
        !imageAttention ||
        !imageScoreReason ||
        !imageFuture
      ) {
        throw new Error(
          "AI画像版X投稿の必要項目が生成されませんでした"
        );
      }

      const imageScoreText =
        `🤖 AI NEWS評価：${score}点\n${imageScoreReason}`;

      const imageTweetBody = [
        imageHook,
        imageAttention,
        imageScoreText,
        `今後：${imageFuture}`,
      ].join("\n\n");

      const tweet = `${imageTweetBody}

詳細はこちら
${url}`;

      const insightTweet = tweet;
      const analysisLabel =
        "AI NEWSジャパンの見方";
      const analysis = imageFuture;
      const description = imageTweetBody;

      return NextResponse.json({
        tweet,
        insightTweet,
        score,
        hook: imageHook,
        description: imageAttention,
        analysisLabel,
        analysis,
        intentUrl:
          "https://x.com/intent/post?text=" +
          encodeURIComponent(tweet),
        insightIntentUrl:
          "https://x.com/intent/post?text=" +
          encodeURIComponent(insightTweet),
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI NEWSジャパンのX投稿編集AIです。

ニュース記事を読み、Xだけ読んでもニュースの価値が分かる投稿を作成してください。

【投稿構造】

1. label

投稿冒頭につける短いラベル。

ニュース内容に合うものを1つ選ぶ。

使用例：
【話題】
【注目】
【発表】
【決定】
【新展開】
【速報】
【注目ニュース】

ニュース内容に合わないラベルは禁止。
毎回【話題】固定にせず、記事内容に応じて選択する。

2. hook

最初の1行。

「何が起きたのか」を最優先にする。

記事タイトルの意味を変えず、具体的な出来事を一文で示す。

不要な煽りや感情表現は禁止。

3. attention

「なぜ今注目なのか」を2〜4行で説明する。

ニュース本文・要約にある情報だけを使う。

単なるタイトルの言い換えは禁止。

今回注目される理由が具体的に分かる文章にする。

4. future

「今後どうなるか」。

ニュース本文から確認できる結果や変化、または記事に明記された今後の動きを優先する。

記事にない将来予測を勝手に作らない。

「普及しそう」「注目されそう」だけで終わらせない。

誰が何をするようになるか、何が変わるかを具体的にする。

記事から将来像を断定できない場合は、記事に書かれている範囲の変化を述べる。

【最重要ルール】

・記事にない事実は禁止
・記事にない数字は禁止
・記事にない人物情報は禁止
・根拠のない推測は禁止
・過度な煽りは禁止
・「衝撃」「ヤバい」「歴史的」など根拠のない表現は禁止
・URLは出力しない
・「詳しくはこちら」「続きはこちら」などの誘導は禁止
・「です・ます」は使用しない
・「でやんす」は使用しない
・顔文字は禁止
・絵文字は禁止
・毎回同じ言い回しにならないようにする
・投稿本文だけで内容が分かるようにする
・文章を途中で終わらせない

【X向け文字量】

label：2〜8文字程度
hook：20〜55文字程度
attention：50〜100文字程度
future：40〜80文字程度

全体としてURLを除いて250文字以内を目安にする。

JSONのみ返してください。

{
  "label": "",
  "hook": "",
  "attention": "",
  "future": ""
}
`,
        },
        {
          role: "user",
          content: `

タイトル：

${news.title}

要約：

${news.summary ?? ""}

カテゴリ：

${news.category ?? "国内"}

`,
        },
      ],
      temperature: 0.8,
      max_tokens: 320,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "x_post",
          strict: true,
          schema: {
            type: "object",
            properties: {
              label: {
                type: "string",
              },
              hook: {
                type: "string",
              },
              attention: {
                type: "string",
              },
              future: {
                type: "string",
              },
            },
            required: [
              "label",
              "hook",
              "attention",
              "future",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent =
      response.choices[0]?.message?.content?.trim() ?? "";

    console.log("OpenAI rawContent:", rawContent);
    console.log(
      "OpenAI refusal:",
      response.choices[0]?.message?.refusal
    );

    let parsed: {
      label: string;
      hook: string;
      attention: string;
      future: string;
    };

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error(
        "AIの構造化出力を解析できませんでした"
      );
    }

    const label = cleanText(parsed.label)
      .replace(/でやんす[。！!]?/gi, "")
      .trim();

    const hook = cleanHook(parsed.hook)
      .replace(/^「|」$/g, "")
      .trim();

    const attention = cleanText(parsed.attention)
      .replace(/でやんす[。！!]?/gi, "")
      .trim();

    const future = cleanText(parsed.future)
      .replace(/でやんす[。！!]?/gi, "")
      .trim();

    if (!label || !hook || !attention || !future) {
      throw new Error(
        "X投稿の必要項目が生成されませんでした"
      );
    }

    const tweetBody = [
      `${label}${hook}`,
      attention,
      `今後：${future}`,
    ].join("\n\n");

    const tweet = `${tweetBody}

詳細はこちら

${url}`;

    const insightTweet = tweet;
    const analysisLabel = "";
    const analysis = "";
    const description = tweetBody;

    // 最終チェック
    if (
      tweet.includes('{"') ||
      tweet.includes('{"result"') ||
      tweet.includes('{"response"') ||
      tweet.includes('{"content"') ||
      tweet.includes('{"hook"') ||
      tweet.includes('{"description"')
    ) {
      throw new Error(
        "X投稿にJSON文字列が混入したため投稿を中止しました"
      );
    }

    return NextResponse.json({
      tweet,
      insightTweet,
      score,
      hook,
      description,
      analysisLabel,
      analysis,
      intentUrl:
        "https://x.com/intent/post?text=" +
        encodeURIComponent(tweet),
      insightIntentUrl:
        "https://x.com/intent/post?text=" +
        encodeURIComponent(insightTweet),
    });
  } catch (error) {
    console.error("X投稿生成エラー:", error);

    return NextResponse.json(
      {
        error: "X投稿の生成に失敗しました",
      },
      { status: 500 }
    );
  }
}
