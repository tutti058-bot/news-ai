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

    if (!newsId) {
      return NextResponse.json(
        { error: "newsIdが必要です" },
        { status: 400 }
      );
    }

    const news = await prisma.news.findUnique({
      where: { id: newsId },
      select: {
        title: true,
        summary: true,
        category: true,
      },
    });

    if (!news) {
      return NextResponse.json(
        { error: "記事が見つかりません" },
        { status: 404 }
      );
    }

    const prompt = `
Create a high-quality editorial image for an X post by a Japanese news media account.

News title:
${news.title}

Summary:
${news.summary ?? ""}

Category:
${news.category ?? "ニュース"}

Requirements:
- Create a visually striking news illustration/photo-like editorial image.
- The image must clearly relate to the news topic.
- Do NOT copy the original article thumbnail.
- Do NOT include any text, letters, logos, headlines, captions, watermarks, or UI elements in the image.
- Do NOT invent specific people if the news does not clearly identify them.
- Prefer a realistic, polished editorial-news aesthetic.
- Strong composition that works well on an X timeline.
- Horizontal 3:2 composition.
`;

    const result = await openai.images.generate({
      model: "gpt-image-1.5",
      prompt,
      size: "1536x1024",
      quality: "medium",
    });

    const image = result.data?.[0]?.b64_json;

    if (!image) {
      throw new Error("画像データを取得できませんでした");
    }

    return NextResponse.json({
      image: `data:image/png;base64,${image}`,
    });
  } catch (error) {
    console.error("X画像生成エラー:", error);

    return NextResponse.json(
      { error: "X画像の生成に失敗しました" },
      { status: 500 }
    );
  }
}
