import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newsId = Number(body.newsId);
    const intentUrl = body.intentUrl;

    if (!newsId || !intentUrl) {
      return NextResponse.json(
        { error: "newsIdとintentUrlが必要です" },
        { status: 400 }
      );
    }

    await prisma.news.update({
      where: {
        id: newsId,
      },
      data: {
        xPostUrl: intentUrl,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("X投稿URL保存エラー:", error);

    return NextResponse.json(
      {
        error: "X投稿URLの保存に失敗しました",
      },
      { status: 500 }
    );
  }
}
