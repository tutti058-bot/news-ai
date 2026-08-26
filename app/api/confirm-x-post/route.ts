import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newsId = Number(body.newsId);
    const xPostUrl = body.xPostUrl;

    if (!newsId) {
      return NextResponse.json(
        { error: "newsIdが必要です" },
        { status: 400 }
      );
    }

    const news = await prisma.news.findUnique({
      where: { id: newsId },
    });

    if (!news) {
      return NextResponse.json(
        { error: "記事が見つかりません" },
        { status: 404 }
      );
    }

    // 実際のX投稿URLがなければ保存しない
    if (
      typeof xPostUrl !== "string" ||
      !/https?:\/\/x\.com\/[^\s]+\/status\/\d+/i.test(
        xPostUrl
      )
    ) {
      return NextResponse.json(
        {
          error:
            "実際のX投稿URLを入力してください。",
        },
        { status: 400 }
      );
    }

    await prisma.news.update({
      where: { id: newsId },
      data: {
        xPostUrl,
      },
    });

    return NextResponse.json({
      success: true,
      xPostUrl,
    });
  } catch (error) {
    console.error("X投稿確認エラー:", error);

    return NextResponse.json(
      {
        error: "X投稿済み状態の保存に失敗しました",
      },
      { status: 500 }
    );
  }
}
