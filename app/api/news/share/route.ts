import { prisma } from "@/lib/prisma";
import { generateYansuComment } from "@/lib/ai";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const newsId = Number(searchParams.get("newsId"));
    const type = searchParams.get("type");

    if (!newsId || !type) {
      return NextResponse.json(
        { error: "必要な情報がありません" },
        { status: 400 }
      );
    }

    if (type !== "x" && type !== "line") {
      return NextResponse.json(
        { error: "不正なシェアタイプです" },
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
        { error: "記事が見つかりません" },
        { status: 404 }
      );
    }

    // シェアを記録
    await prisma.newsShare.create({
      data: {
        newsId,
        type,
      },
    });

    const articleUrl =
      `https://tutti-news-ai-bay.vercel.app/news/${newsId}`;

    // Xシェア
    if (type === "x") {
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
${articleUrl}`;

      const xUrl =
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          tweet
        )}`;

      return NextResponse.redirect(xUrl);
    }

    // LINEシェア
    const lineUrl =
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(
        articleUrl
      )}`;

    return NextResponse.redirect(lineUrl);

  } catch (error) {
    console.error("シェア記録エラー:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : String(error);

    return NextResponse.json(
      {
        error: "シェア記録に失敗しました",
        detail: errorMessage,
      },
      {
        status: 500,
      }
    );
  }
}