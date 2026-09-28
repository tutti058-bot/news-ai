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

    // イメージ投稿：同じニュースから4パターンの短文を生成
    if (body.mode === "image-post") {
      const imageCandidatesResponse =
        await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: `
あなたはAI NEWSジャパンのX投稿編集AIです。

ニュース記事を読み、X向けの投稿文を4パターン作成してください。

【基本ルール】
・ニュース本文と要約にある事実だけを使う
・記事にない事実、数字、人物情報は禁止
・根拠のない予測は禁止
・過度な煽りは禁止
・ハッシュタグは禁止
・絵文字は禁止
・「です・ます」は使わない
・「でやんす」は使わない
・短く自然で、ラフに読める文章にする
・コメントや反応をしやすい余白を残す
・記事タイトルをそのまま貼り付けたような文章は禁止
・同じ内容を言い換えるだけの4案は禁止

【文字量】
原則、各案140文字以内。
ただし、ニュースが「事件→事件後→その後」のような明確な時系列を重要情報として含む場合だけ、140文字を超えてよい。
その場合も、時系列を簡潔に整理し、冗長にしない。

【4パターン】

4案は「同じニュースを別の言葉にしただけ」にしない。
4案それぞれで、書き出し・文章構造・伝えるポイントを変える。

4案同士で同じ主要事実を丸ごと繰り返さない。
4案を作る前に、記事内の重要な事実を複数整理し、
可能な範囲で各案が異なる事実・視点を中心にする。
同じ事実を4案すべての中心にしない。
4案を完成させた後、4案同士の重複を自己チェックする。
①と④が同じ数字・同じ中心事実・同じ情報順になっていた場合は、
④を書き直して別の事実を中心にする。
特に①で「約660万件」などの具体的な数字を使った場合、
④では原則として同じ数字を使わない。
④は「対応」「影響」「判明事項」「漏えいしていない情報」など、
記事内の別のポイントを優先する。
4案を並べて読んだとき、それぞれ違う投稿として成立しているか確認してから出力する。
記事に複数の重要事実がある場合は、案ごとに焦点をずらす。
特に1案目と4案目で、同じ事実を同じ順番で並べることは禁止。
1案目が事件・発表そのものを中心にした場合、
4案目は記事内の別の重要ポイントを中心にする。

1. ニュース型
   ニュースの核心だけを最短で伝える。
   「何が起きたか」を中心にし、1〜2個の重要事実までに絞る。
   情報を詰め込みすぎず、記事全体を要約しない。
   感想、問いかけ、煽りは禁止。
   見出しを少し自然なX文章にしたような形にする。

2. ひとこと反応型
   ニュースを見た瞬間の自然なリアクションとして書く。
   必ずリアクション感のある書き出しにする。
   「え、」「これは大きいな」「こういうことだったのか」「ちょっと気になる」など、
   人がニュースを見て思わず口にするような自然な入り方を優先する。
   「○○が発表」「○○で不正アクセス」など、ニュース見出しそのもので始めない。
   疑問文・質問文は禁止。
   「？」を使わない。
   質問やコメントを促す役割は3案目に任せる。
   リアクションの後には、記事内の事実を1つ程度だけ添える。
   記事にない感情、評価、事実は追加しない。
   単なるニュース要約を、少し言い換えただけの文章にはしない。
   短く、Xで自然に読める文章にする。

3. コメント誘導型
   記事の中から、読者が考えたり意見を言いやすい具体的な論点を1つ選ぶ。
   その事実や状況を短く提示したあと、具体的な問いを置く。
   「みんなはどう思う？」「どう思う？」など、
   どんなニュースにも使える汎用的な質問は禁止。
   「今後の対応は？」「利用者は何を確認すべき？」のように、
   記事内容から自然に導ける具体的な問いにする。
   問いは記事内の事実に直接つながる内容にする。
   記事にない前提、答え、予測、評価は加えない。
   質問を作るためにニュースの事実を誇張しない。

4. ニュースラベル型
   1案目とは違う事実・ポイントを中心にする。
   1案目で使用した数字・中心事実を原則として繰り返さない。
   特に「約660万件」のように1案目で使った最重要の数字を、
   ④でそのまま再利用することは禁止。
   1案目とは別の事実（被害内容、対応、影響、判明事項など）を優先する。
   まず記事内の重要な事実を複数整理し、
   1案目で中心にした事実とは別のポイントを1つ選んで書く。
   1案目と同じ主要事実を丸ごと繰り返すことは禁止。
   記事内に別の重要ポイントがある場合は、そちらを優先する。
   別の事実がない場合も、1案目の全文を言い換えるだけにはしない。

   記事内容に適している場合、冒頭にラベルを1つだけ付ける。

   使用できるラベル：
   【速報】【驚愕】【訃報】【朗報】【注目】【話題】【判明】【発表】

   ラベルは記事内容に明確に適合する場合だけ使用する。
   ラベルを付けるために事実を誇張してはいけない。

   「速報」：
   新たに発生・発表された速報性の高いニュース。

   「驚愕」：
   記事内に明確に驚きの大きい事実がある場合。

   「訃報」：
   死去が記事内で明確に確認できる場合。

   「朗報」：
   喜ばしい発表・結果など、記事内容から明確に判断できる場合。

   「注目」：
   記事内に特に注目すべきポイントがある場合。

   「話題」：
   実際に話題になっていることが記事内で確認できる場合。

   「判明」：
   新たに判明した事実を伝える場合。

   「発表」：
   企業・団体・人物などによる正式な発表を伝える場合。

   基本形は「ラベル＋別の重要ポイント1つ」。
   1案目と同じ事実を同じ順番で並べない。
   情報を詰め込みすぎず、短い投稿として成立させる。
   適切なラベルがない場合は、ラベルなしで作成する。

【重要】
・政治、事件、事故などを扱う場合も、事実関係を中立に表現する
・特定の人物や政党などを持ち上げたり貶めたりする表現は禁止
・「すごい」「ヤバい」「衝撃」など主観的な煽りは禁止
・記事にない未来予測は禁止
・URLは禁止

JSONのみ返してください。

{
  "candidates": [
    "",
    "",
    "",
    ""
  ]
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
          temperature: 0.85,
          max_tokens: 900,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "x_image_post_candidates",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  candidates: {
                    type: "array",
                    minItems: 4,
                    maxItems: 4,
                    items: {
                      type: "string",
                    },
                  },
                },
                required: ["candidates"],
                additionalProperties: false,
              },
            },
          },
        });

      const rawCandidates =
        imageCandidatesResponse.choices[0]?.message?.content?.trim() ?? "";

      let parsedCandidates: {
        candidates: string[];
      };

      try {
        parsedCandidates = JSON.parse(rawCandidates);
      } catch {
        throw new Error(
          "イメージ投稿候補の解析に失敗しました"
        );
      }

      const candidates = Array.isArray(parsedCandidates.candidates)
        ? parsedCandidates.candidates
            .map((candidate) =>
              cleanText(candidate)
                .replace(/追加情報はリプへ👇/g, "")
                .replace(/https?:\/\/\S+/g, "")
                .trim()
            )
            .filter(Boolean)
            .slice(0, 4)
        : [];

      if (candidates.length < 4) {
        throw new Error(
          "イメージ投稿の候補文を4案生成できませんでした"
        );
      }

      return NextResponse.json({
        candidates,
        tweet: candidates[0],
        insightTweet: candidates[0],
        score,
        hook: candidates[0],
        description: candidates[0],
        analysisLabel: "",
        analysis: "",
      });
    }

    // AI画像版は通常版と同じX投稿フォーマットを使用
    if (body.mode === "ai-image") {
      const imageResponse =
        await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: `
あなたはAI NEWSジャパンのX投稿編集AIです。

ニュース記事を読み、Xだけ読んでもニュースの価値が分かる投稿を作成してください。

AI画像版でも、通常版と同じ投稿フォーマットを使用します。

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

「何が起きたのか」を具体的に示す1文。

記事タイトルの意味を変えない。
不要な煽りや感情表現は禁止。

必要に応じて、冒頭フックは体言止めで簡潔にまとめてもよい。
例：「〜可能性。」「〜判明。」「〜発表。」
ただし、意味や事実関係を変えないこと。

3. attention

「なぜ今注目なのか」を具体的に説明する。

ニュース本文・要約にある情報だけを使う。
単なるタイトルの言い換えは禁止。

4. future

「今後どうなるか」。

ニュース本文から確認できる結果や変化、または記事に明記された今後の動きを優先する。

記事にない将来予測を勝手に作らない。
「普及しそう」「注目されそう」だけで終わらせない。

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
              name: "x_image_post",
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

      const rawImageContent =
        imageResponse.choices[0]?.message?.content?.trim() ?? "";

      let imagePost: {
        label: string;
        hook: string;
        attention: string;
        future: string;
      };

      try {
        imagePost = JSON.parse(rawImageContent);
      } catch {
        throw new Error(
          "AI画像版X投稿の解析に失敗しました"
        );
      }

      const imageLabel = cleanText(imagePost.label)
        .replace(/でやんす[。！!]?/gi, "")
        .trim();

      const imageHook = cleanHook(imagePost.hook)
        .replace(/追加情報はリプへ👇/g, "")
        .replace(/^「|」$/g, "")
        .trim();

      const imageAttention = cleanText(
        imagePost.attention
      )
        .replace(/追加情報はリプへ👇/g, "")
        .replace(/でやんす[。！!]?/gi, "")
        .trim();

      const imageFuture = cleanText(imagePost.future)
        .replace(/追加情報はリプへ👇/g, "")
        .replace(/でやんす[。！!]?/gi, "")
        .trim();

      if (
        !imageLabel ||
        !imageHook ||
        !imageAttention ||
        !imageFuture
      ) {
        throw new Error(
          "AI画像版X投稿の必要項目が生成されませんでした"
        );
      }

      const imageTweetBody = [
        `${imageLabel}${imageHook}`,
        imageAttention,
        `今後：${imageFuture}`,
      ].join("\n\n");

      const tweet = `${imageTweetBody}

詳細はこちら

${url}`;

      const insightTweet = tweet;
      const analysisLabel = "";
      const analysis = "";
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

必要に応じて、冒頭フックは体言止めで簡潔にまとめてもよい。
例：「〜可能性。」「〜判明。」「〜発表。」
ただし、意味や事実関係を変えないこと。

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
