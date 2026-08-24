import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


function cleanXPostText(value: unknown): string {
  if (typeof value !== "string") {
    return String(value ?? "");
  }

  let text = value.trim();

  // コードブロック除去
  text = text
    .replace(/```json/gi, "")
    .replace(/```text/gi, "")
    .replace(/```/g, "")
    .trim();

  // JSONとして解釈できる場合は本文だけ取り出す
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
          obj.result,
          obj.response,
          obj.content,
          obj.text,
          obj.message,
          obj.hook,
          obj.description,
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
      // JSONではない通常の文章
    }

    break;
  }

  // JSON風の {"result":"..."} が文字列として残っている場合
  text = text
    .replace(
      /^\s*\{\s*["'](?:result|response|content|text|message|hook|description)["']\s*:\s*["']([\s\S]*?)["']\s*\}\s*$/i,
      "$1"
    )
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\"/g, '"')
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*#+\s*/gm, "")
    .replace(/\r?\n+/g, "\n")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();

  return text;
}

export async function POST() {
  try {
    const news = await prisma.news.findFirst({
      orderBy: {
        publishedAt: "desc",
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

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI NEWS ジャパン専属AIニュースキャスター「やんすAI」です。

ニュース記事を読み、X投稿用の「フック」と「短い説明」を作成してください。

フック：
20〜50文字程度。
読者が「え、どういうこと？」と思って記事を開きたくなる内容。
記事に存在しない数字・事実は禁止。
最後は必ず「でやんす」。

短い説明：
20〜45文字程度。
ニュースの核心を少しだけ伝え、続きを読みたくなる内容。
「でやんす」は付けない。

重要：
フックと短い説明以外は出力しない。
`
        },
        {
          role: "user",
          content: `
タイトル：
${news.title}

要約：
${news.summary ?? ""}

フックと短い説明を作成してください。
`
        }
      ],
      temperature: 0.7,
      max_tokens: 120,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "x_post",
          strict: true,
          schema: {
            type: "object",
            properties: {
              hook: {
                type: "string"
              },
              description: {
                type: "string"
              }
            },
            required: ["hook", "description"],
            additionalProperties: false
          }
        }
      }
    });

    const rawContent =
      response.choices[0]?.message?.content?.trim() ?? "";

    let parsed: {
      hook: string;
      description: string;
    };

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error("AIの構造化出力を解析できませんでした");
    }

    let hook = parsed.hook.trim();
    let description = parsed.description.trim();

    hook = hook
      .replace(/^「|」$/g, "")
      .replace(/でやんすね$/g, "")
      .replace(/でやんす$/g, "")
      .trim();

    description = description
      .replace(/^「|」$/g, "")
      .replace(/でやんす$/g, "")
      .trim();

    hook = `${hook}でやんす`;

    let tweet = `やんすAI
「${hook}」
${description}

AI評価：${score}点／100点

👇 詳細はこちら
${url}`;

    // tweet全体にJSONが混入していた場合の最終防御
    tweet = tweet
      .replace(/```(?:json|text)?/gi, "")
      .replace(/```/g, "")
      .trim();

    return NextResponse.json({
      tweet,
      score,
      hook,
      description,
      intentUrl:
        "https://twitter.com/intent/tweet?text=" +
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