import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateYansuComment } from "@/lib/ai";

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

  const score = news.score ?? 60;

  const aiComment = await generateYansuComment(
    news.title,
    news.summary ?? "",
    score,
    news.category ?? "国内"
  );

  const tweet = `やんすAI
「${aiComment}」

AI評価：${score}点／100点

👇 詳細はこちら
${url}`;

  return NextResponse.json({
    tweet,
    score,
    intentUrl:
      "https://twitter.com/intent/tweet?text=" +
      encodeURIComponent(tweet),
  });
}