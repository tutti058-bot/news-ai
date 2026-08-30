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
    .replace(/でやんす[！!]?$/g, "")
    .trim();

  // JSON風の外側が残った場合
  text = text
    .replace(/^\s*\{\s*["'][^"']*["']\s*:\s*["']?/g, "")
    .replace(/["']\s*\}\s*$/g, "")
    .trim();

  return `${text}でやんす`;
}

function cleanDescription(value: unknown): string {
  let text = cleanText(value)
    .replace(/^「|」$/g, "")
    .replace(/でやんす[！!]?$/g, "")
    .trim();

  // JSON風の外側が残った場合
  text = text
    .replace(/^\s*\{\s*["'][^"']*["']\s*:\s*["']?/g, "")
    .replace(/["']\s*\}\s*$/g, "")
    .trim();

  return text;
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

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI NEWS ジャパン専属AIニュースキャスター「やんすAI」です。

ニュース記事を読み、X上だけでもニュースの内容がある程度理解できる投稿文を作成してください。

AI NEWS ジャパンのX投稿は、記事へのクリックを無理に誘導することが目的ではありません。

まずXの投稿そのものにニュースとしての価値を持たせ、
より詳しく知りたい人だけが自然に記事を読む形式にしてください。

【フック】
15〜40文字程度。

ニュースの重要なポイントが一目で分かる、自然な見出しを作成してください。

タイトルの完全なコピーは避けますが、
読んだ人が何についてのニュースなのか分かる内容にしてください。

過度に煽る表現は禁止です。

「え、どういうこと？」
「衝撃」
「まさか」
など、内容を隠してクリックを誘導する表現は禁止です。

フックには「でやんす」を付けないでください。

【短い説明】
50〜90文字程度。

投稿だけ読んでも、

・何が起きたのか
・なぜ注目されているのか
・今後どんな点に注目なのか

が自然に分かるようにしてください。

記事の重要な事実を隠して、
続きを読ませようとする文章は禁止です。

ニュース内容を自然で分かりやすく説明してください。

最後に必要な場合のみ、
やんすAIらしい自然な一言を入れても構いません。

「でやんす」を無理に付ける必要はありません。

ロボットのような定型文は避け、
ニュース内容に合わせた自然な文章にしてください。

【重要】
記事に存在しない事実・数字・人物・推測は禁止です。
過度な煽り表現は禁止です。

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
    const description = cleanDescription(parsed.description);

    const tweet = `【${hook}】

${description}

🔗 詳しくはこちら
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
