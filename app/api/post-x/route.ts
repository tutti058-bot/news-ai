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
