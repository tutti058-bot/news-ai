import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const newsId = Number(body.newsId);

    const tweetText =
      typeof body.tweetText === "string"
        ? body.tweetText.trim()
        : "";

    if (!newsId || !tweetText) {
      return NextResponse.json(
        {
          error: "newsIdとtweetTextが必要です",
        },
        { status: 400 }
      );
    }

    const news = await prisma.news.findUnique({
      where: {
        id: newsId,
      },
      select: {
        id: true,
        title: true,
        summary: true,
        category: true,
      },
    });

    if (!news) {
      return NextResponse.json(
        {
          error: "記事が見つかりません",
        },
        { status: 404 }
      );
    }

    const response =
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `
あなたはAI NEWS ジャパン専属AIニュースキャスター「やんすAI」です。

ニュースに関連するX投稿に対して、
自然な返信コメントを2パターン作成してください。

【目的】
単なる宣伝や定型文ではなく、
投稿内容を読んだうえで自然にニュースについて会話するコメントを作ります。

【ルール】
・投稿内容とニュース内容に関係するコメントにする
・記事に存在しない事実を追加しない
・推測や断定は禁止
・相手を批判、攻撃しない
・過度な宣伝は禁止
・URLを本文に入れない
・ハッシュタグを入れない
・「記事を読んでください」などの直接的な誘導は禁止
・自然な会話として読める文章にする
・40〜100文字程度
・一人称は「ボク」
・最後は自然に「〜でやんす。」または「〜でやんす！」で締める
・2つのコメントは内容や表現をできるだけ変える
・コメント①とコメント②は似た文章にしない

必ずJSONだけを返してください。

{
  "reply1": "コメント案1",
  "reply2": "コメント案2"
}
`,
          },
          {
            role: "user",
            content: `
【ニュースタイトル】
${news.title}

【ニュース要約】
${news.summary ?? ""}

【ニュースカテゴリ】
${news.category ?? ""}

【返信したいX投稿】
${tweetText}

この投稿に対する自然な返信コメントを2案作成してください。
`,
          },
        ],
        temperature: 0.9,
        max_tokens: 300,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "x_reply",
            strict: true,
            schema: {
              type: "object",
              properties: {
                reply1: {
                  type: "string",
                },
                reply2: {
                  type: "string",
                },
              },
              required: [
                "reply1",
                "reply2",
              ],
              additionalProperties: false,
            },
          },
        },
      });

    const raw =
      response.choices[0]?.message?.content ??
      "{}";

    let parsed: {
      reply1?: string;
      reply2?: string;
    } = {};

    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        "コメントの解析に失敗しました"
      );
    }

    const cleanReply = (text: string) =>
      text
        .replace(/^「|」$/g, "")
        .replace(/^["']|["']$/g, "")
        .trim();

    const reply1 = cleanReply(
      parsed.reply1 ?? ""
    );

    const reply2 = cleanReply(
      parsed.reply2 ?? ""
    );

    if (!reply1 || !reply2) {
      throw new Error(
        "コメントを生成できませんでした"
      );
    }

    const articleUrl =
      `https://tutti-news-ai-bay.vercel.app/news/${news.id}`;

    return NextResponse.json({
      reply1,
      reply2,
      replyWithUrl1:
        `${reply1}\n\n👇 関連記事はこちら\n${articleUrl}`,
      replyWithUrl2:
        `${reply2}\n\n👇 関連記事はこちら\n${articleUrl}`,
      articleUrl,
    });
  } catch (error) {
    console.error(
      "Xコメント生成エラー:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "コメント生成に失敗しました",
      },
      { status: 500 }
    );
  }
}
