import { NextResponse } from "next/server";
import { getTwitterClient } from "@/lib/x";
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

    const twitterClient = getTwitterClient();

const tweetWithImage = news.image 
  ? `${tweet}\n\n🖼️ ${news.image}`
  : tweet;

const result = await twitterClient.v2.tweet(tweetWithImage);

    return NextResponse.json({
      success: true,
      id: result.data.id,
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