import { prisma } from "@/lib/prisma";
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

    if (
      type !== "x" &&
      type !== "line" &&
      type !== "facebook" &&
      type !== "threads" &&
      type !== "hatena"
    ) {
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

    await prisma.newsShare.create({
      data: {
        newsId,
        type,
      },
    });

    const articleUrl =
      `https://tutti-news-ai-bay.vercel.app/news/${newsId}`;

    // Xシェア
    // 記事ページからのXシェアは読者向けの通常シェア。
    // やんすAIの投稿文生成は管理画面側だけで行う。
    if (type === "x") {
      const xUrl =
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(
          articleUrl
        )}`;

      return NextResponse.redirect(xUrl);
    }

    // LINEシェア
    if (type === "line") {
      const lineUrl =
        `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(
          articleUrl
        )}`;

      return NextResponse.redirect(lineUrl);
    }

    // Facebookシェア
    if (type === "facebook") {
      const facebookUrl =
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          articleUrl
        )}`;

      return NextResponse.redirect(facebookUrl);
    }

    // Threadsシェア
    if (type === "threads") {
      const threadsText =
        `${news.title}\n\n${articleUrl}`;

      const threadsUrl =
        `https://www.threads.net/intent/post?text=${encodeURIComponent(
          threadsText
        )}`;

      return NextResponse.redirect(threadsUrl);
    }

    // はてなブックマーク
    if (type === "hatena") {
      const hatenaUrl =
        `https://b.hatena.ne.jp/add?mode=confirm&url=${encodeURIComponent(
          articleUrl
        )}`;

      return NextResponse.redirect(hatenaUrl);
    }

    return NextResponse.json(
      { error: "不明なシェアタイプです" },
      { status: 400 }
    );
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
