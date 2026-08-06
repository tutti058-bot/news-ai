import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const news = await prisma.news.findFirst({
      orderBy: {
        publishedAt: "desc",
      },
    });

    if (!news) {
      return NextResponse.json({
        error: "記事がありません",
      });
    }

    const url = `https://tutti-news-ai-bay.vercel.app/news/${news.id}`;

    const tweet =
`【${news.category ?? "ニュース"}】

${news.title}

AI要約👇
${news.summary ?? ""}

続きを読む👇
${url}

#ニュース`;
return NextResponse.json({
  success: true,
  tweet,
  intentUrl:
    "https://twitter.com/intent/tweet?text=" +
    encodeURIComponent(tweet),
});

  } catch (error: any) {
  console.error(error);

  return NextResponse.json(
    {
      success: false,
      error: error.message,
    },
    {
      status: 500,
    }
  );
}
}