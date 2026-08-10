import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTweet } from "@/lib/ai";

export async function POST() {
  const news = await prisma.news.findFirst({
    orderBy: {
      publishedAt: "desc",
    },
  });

  if (!news) {
    return NextResponse.json(
      { error: "記事がありません" },
      { status: 404 }
    );
  }

  const url = `https://tutti-news-ai-bay.vercel.app/news/${news.id}`;

  const aiTweet = await generateTweet(
    news.title,
    news.summary ?? ""
  );

  const tweet = `${aiTweet}

続きを読む👇
${url}`;

  return NextResponse.json({
    tweet,
    intentUrl:
      "https://twitter.com/intent/tweet?text=" +
      encodeURIComponent(tweet),
  });
}