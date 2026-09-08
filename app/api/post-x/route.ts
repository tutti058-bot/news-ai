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

    // AI画像版だけ専用フォーマットで生成
    if (body.mode === "ai-image") {
      const imageResponse =
        await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: `
AI NEWSジャパンのAI画像付きX投稿を作成してください。

必ず以下の構成にする。

hook
content

最終投稿はシステム側で、

hook

content

追加情報は👇

の形にする。

【hook】
短いフック＋タイトル。

基本形：
新展開【タイトル】

例：
速報【政府が新制度を発表】
衝撃【人気サービスが終了へ】
新展開【日本初スターバックス専用自販機が全国展開へ】
話題【○○が新サービスを発表】

フックはニュース内容に合うものを選ぶ。
毎回同じフックにしない。
不要ならタイトルだけでもよい。

重要：
「【速報】タイトル」の形でもよいが、
hook全体をさらに【】で囲まない。
「【【速報】タイトル】」は禁止。
最終的には、
フック【タイトル】
の形を優先する。

タイトルは元記事の意味を変えない。

【content】
ニュースで実際に起きたことを、35〜70文字程度で簡潔に書く。
基本は1文〜2文。
情報を詰め込みすぎず、最も重要な事実だけを書く。

記事にない事実、数字、人物情報、推測は禁止。
です・ますは禁止。
でやんす禁止。
自然な常体にする。
URLは禁止。
「追加情報は👇」は禁止。これはシステム側で最後に1回だけ付ける。

JSONのみ返す。

{
  "hook": "新展開【タイトル】",
  "content": "ニュースの内容"
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
          max_tokens: 220,
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
                  content: {
                    type: "string",
                  },
                },
                required: ["hook", "content"],
                additionalProperties: false,
              },
            },
          },
        });

      const rawImageContent =
        imageResponse.choices[0]?.message?.content?.trim() ?? "";

      let imagePost: {
        hook: string;
        content: string;
      };

      try {
        imagePost = JSON.parse(rawImageContent);
      } catch {
        throw new Error(
          "AI画像版X投稿の解析に失敗しました"
        );
      }

      let imageHook = cleanText(imagePost.hook)
        .replace(/追加情報は👇/g, "")
        .replace(/^「|」$/g, "")
        .trim();

      let imageContent = cleanText(imagePost.content)
        .replace(/追加情報は👇/g, "")
        .replace(/でやんす[。！!]?$/gi, "")
        .trim();

      // さらに長すぎる場合は画像投稿向けに短くする
      if (imageContent.length > 80) {
        imageContent = imageContent.slice(0, 80).replace(/[、。]$/, "") + "。";
      }

      // hookを「フック【タイトル】」に正規化
      const bracketMatch = imageHook.match(
        /^【([^】]+)】(.+)$/
      );

      if (bracketMatch) {
        imageHook =
          `${bracketMatch[1].trim()}【${bracketMatch[2]
            .replace(/^【+/, "")
            .replace(/】+$/, "")
            .trim()}】`;
      } else {
        const normalMatch = imageHook.match(
          /^(.+?)【(.+?)】$/
        );

        if (normalMatch) {
          imageHook =
            `${normalMatch[1].replace(/[【】]/g, "").trim()}【${normalMatch[2].trim()}】`;
        }
      }

      if (!imageHook || !imageContent) {
        throw new Error(
          "AI画像版X投稿の生成結果が空です"
        );
      }

      const tweet = `${imageHook}

${imageContent}`
        .replace(/(?:\n\s*)*追加情報は👇/g, "")
        .trim() + `

追加情報は👇`;

      return NextResponse.json({
        tweet,
        score,
        hook: imageHook,
        description: imageContent,
        intentUrl:
          "https://x.com/intent/post?text=" +
          encodeURIComponent(tweet),
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI NEWSジャパン専属AIニュースキャスター「やんすAI」です。

ニュース記事を読み、Xで「思わず手を止める」「内容を理解したくなる」「自然に反応したくなる」投稿文を作成してください。

AI NEWSジャパンの投稿は、単なるニュースの転載やタイトルの要約ではありません。

ニュースそのものの価値を伝えながら、
やんすAIならではの視点を少し加え、
読んだ人の中に自然な興味や会話の余白が生まれる投稿を作ってください。

ただし、無理に質問したり、
毎回「どう思いますか？」と聞いたり、
コメントや拡散をお願いしたりすることは禁止です。

【投稿の基本構造】

投稿は以下の2つで構成します。

1. hook
2. description

最終的な投稿は、

【ラベル】タイトル

description

という形になります。

記事URLはシステム側で自動追加します。

────────────────

【hook】

ニュース記事のタイトル部分を作成してください。

基本は、

【タイトル】

ではなく、

【必要なら強いラベル】タイトル

という1行にしてください。

タイトルは元記事の内容が一目で分かるものにする。

元記事タイトルをそのまま使ってもよいが、
読みやすさのために軽く整えてよい。

タイトルの意味を変えてはいけません。

【ラベルについて】

ニュース内容に強いインパクトがある場合だけ、
タイトルの前に短いラベルを1つ付けてください。

例：

【完全終了】
【衝撃】
【速報】
【激震】
【緊急】
【激変】
【まさか】
【歴史的】

ただし、
ニュース内容に明確に合う場合だけ使用してください。

毎回ラベルを付けるのは禁止。

特に【完全終了】は、
本当に重大な終了・破綻・撤退などの内容である場合だけ使用してください。

根拠のない煽りは禁止です。

タイトルだけを見ても
何のニュースか分かるようにしてください。

────────────────

────────────────

【description】

40〜80文字程度。

基本構成は必ず、

① 何が起きたか
↓
② その結果どうなったか

の2段階にしてください。

例：

「○○が発表され、△△を進めることになった。
↓
これにより□□への影響が広がりそうです。」

「○○で問題が発生。
↓
その影響で△△が停止しました。」

「○○が実現。
↓
これまで難しかった△△が可能になりました。」

【重要】

「ニュースの説明 → 感想」ではなく、

「ニュースの内容 → 結果・変化」

として書いてください。

結果や変化が記事に明確に書かれていない場合は、
記事に書かれている範囲で
「その結果」「これにより」「今後」などを使って
自然につなげてください。

記事にない結果を勝手に推測してはいけません。

「注目です」
「重要です」
「今後に期待です」
だけで終わらせないでください。

記事の内容から、
実際に何が変わったのか、
何が起きるのかを具体的に書いてください。

description内にURLを入れないでください。

「詳しくはこちら」
「続きはこちら」
などのURL誘導も禁止です。

顔文字は禁止。

毎回同じ言い回しや語尾を繰り返さないでください。

「でやんす」を固定で付けないでください。

ニュースの内容に合った自然な文章にしてください。

────────────────

【最重要ルール】

・記事に存在しない事実は禁止
・記事にない数字は禁止
・記事にない人物情報は禁止
・根拠のない推測は禁止
・過度な煽りは禁止
・内容を隠してクリックを誘導しない
・タイトル → 内容 → 結果の流れを優先する
・毎回同じ文章にならないよう表現を変える

構造化されたJSONとして返してください。

hook と description の2項目だけを返してください。
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

AI評価：
${score}点
`,
        },
      ],
      temperature: 0.8,
      max_tokens: 220,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "x_post",
          strict: true,
          schema: {
            type: "object",
            properties: {
              hook: {
                type: "string",
              },
              description: {
                type: "string",
              },
            },
            required: ["hook", "description"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent =
      response.choices[0]?.message?.content?.trim() ?? "";

    console.log("OpenAI rawContent:", rawContent);
    console.log("OpenAI refusal:", response.choices[0]?.message?.refusal);

    let parsed: {
      hook: string;
      description: string;
    };

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error(
        "AIの構造化出力を解析できませんでした"
      );
    }

    const hook = cleanHook(parsed.hook);

    // X冒頭用の短いリアクションを別AIで生成
    const reactionResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "ニュースを見た瞬間にXへ書きそうな自然な短いリアクションを1文だけ作ってください。ニュースの説明や要約は禁止。ニュースを読んだ人が自然に漏らす感想・驚き・興味・納得・意外性などを、そのニュースに合わせて毎回違う表現で作ってください。25〜70文字程度。「でやんす」「です」「ます」「注目」「重要」「ポイント」「今後の展開」などは禁止。顔文字・顔文字記号・定型リアクションは使用しないでください。同じ表現や語尾を繰り返さず、ニュースの内容に応じて文章の形も変えてください。"
        },
        {
          role: "user",
          content:
            `タイトル：
${news.title}

要約：
${news.summary ?? ""}`,
        },
      ],
      temperature: 1,
      max_tokens: 80,
    });

    let reaction = cleanDescription(
      reactionResponse.choices[0]?.message?.content ?? ""
    );

    // キャラクター口調を機械的に除去
    reaction = reaction
      .replace(/でやんす[。！!]?/gi, "")
      .replace(/でやんすね[。！!]?/gi, "")
      .replace(/^「|」$/g, "")
      .trim();

    // リアクションが長すぎる場合は説明文になっている可能性が高いので不採用
    if (reaction.length > 70) {
      reaction = "";
    }

    // 解説調・キャスター調になった場合は不採用
    const badReactionPatterns = [
      "注目したいのは",
      "今回のポイント",
      "重要なのは",
      "注目される",
      "期待される",
      "可能性がある",
      "大きな動き",
      "新たな風を吹き込",
      "時代へ",
      "時代の幕開け",
      "〜点だ",
      "点だ",
    ];

    if (
      badReactionPatterns.some((pattern) =>
        reaction.includes(pattern)
      )
    ) {
      reaction = "";
    }

    // 見出しの内容をリアクションで繰り返していたら不採用
    const segmenter = new Intl.Segmenter("ja", {
      granularity: "word",
    });

    const titleWords = Array.from(
      segmenter.segment(news.title)
    )
      .filter((item) => item.isWordLike)
      .map((item) => item.segment)
      .filter((word) => word.length >= 2);

    const matchedWords = titleWords.filter((word) =>
      reaction.includes(word)
    );

    const explanationLike =
      reaction.includes("注目") ||
      reaction.includes("ポイント") ||
      reaction.includes("新時代") && reaction.length > 22 ||
      reaction.includes("可能性") ||
      reaction.includes("期待") ||
      reaction.includes("成功とか") ||
      reaction.includes("産ロケット");

    const repeatedHeadlineInfo =
      matchedWords.length >= 2 || explanationLike;

    const description = reaction;

    const tweet = `${description}

【${hook}】

${url}`;

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
      score,
      hook,
      description,
      intentUrl:
        "https://x.com/intent/post?text=" +
        encodeURIComponent(tweet),
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
