import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newsId = Number(body.newsId);
    const relatedNewsId = Number(body.relatedNewsId);

    if (!newsId || !relatedNewsId) {
      return NextResponse.json(
        { error: "newsIdとrelatedNewsIdが必要です" },
        { status: 400 }
      );
    }

    const [current, related] = await Promise.all([
      prisma.news.findUnique({
        where: { id: newsId },
      }),
      prisma.news.findUnique({
        where: { id: relatedNewsId },
      }),
    ]);

    if (!current || !related) {
      return NextResponse.json(
        { error: "記事が見つかりません" },
        { status: 404 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI NEWS ジャパン専属AIニュースキャスター「やんすAI」です。

現在の記事に関連する別の記事を自然に紹介する、
X返信用コメントを作成してください。

ルール：
- 20〜60文字程度
- 宣伝っぽくしすぎない
- 「関連記事です」だけは禁止
- 現在の記事と関連記事の共通点に触れる
- 記事にない事実は禁止
- 「でやんす」は基本使わない
- 絵文字は最大1個
- コメント本文だけを返す
`,
        },
        {
          role: "user",
          content: `
【現在の記事】
タイトル：
${current.title}

要約：
${current.summary ?? ""}

カテゴリ：
${current.category ?? ""}

【関連する記事】
タイトル：
${related.title}

要約：
${related.summary ?? ""}

カテゴリ：
${related.category ?? ""}
`,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const comment =
      response.choices[0]?.message?.content?.trim() ?? "";

    if (!comment) {
      throw new Error("コメントを生成できませんでした");
    }

    const relatedUrl =
      `https://tutti-news-ai-bay.vercel.app/news/${related.id}`;

    const replyText =
      `${comment}\n\n👇 関連記事はこちら\n${relatedUrl}`;

    return NextResponse.json({
      comment,
      replyText,
      related: {
        id: related.id,
        title: related.title,
      },
    });
  } catch (error) {
    console.error(
      "関連記事Xコメント生成エラー:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "関連記事Xコメントの生成に失敗しました",
      },
      { status: 500 }
    );
  }
}
