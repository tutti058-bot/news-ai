import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const inboxId = Number(body?.inboxId);

    if (!Number.isInteger(inboxId)) {
      return NextResponse.json(
        {
          success: false,
          error: "inboxIdが不正です",
        },
        { status: 400 }
      );
    }

    const inbox = await prisma.lineInboxItem.findUnique({
      where: { id: inboxId },
      select: {
        id: true,
        generatedNewsId: true,
        status: true,
      },
    });

    if (!inbox) {
      return NextResponse.json(
        {
          success: false,
          error: "LINE受信データが見つかりません",
        },
        { status: 404 }
      );
    }

    if (!inbox.generatedNewsId) {
      return NextResponse.json(
        {
          success: false,
          error: "先に記事を生成してください",
        },
        { status: 400 }
      );
    }

    const news = await prisma.news.findUnique({
      where: {
        id: inbox.generatedNewsId,
      },
      select: {
        id: true,
        title: true,
        publishedAt: true,
      },
    });

    if (!news) {
      return NextResponse.json(
        {
          success: false,
          error: "生成された記事が見つかりません",
        },
        { status: 404 }
      );
    }

    if (news.publishedAt) {
      return NextResponse.json({
        success: true,
        alreadyPublished: true,
        news,
      });
    }

    const publishedAt = new Date();

    const updatedNews = await prisma.news.update({
      where: {
        id: news.id,
      },
      data: {
        publishedAt,
      },
      select: {
        id: true,
        title: true,
        summary: true,
        category: true,
        score: true,
        publishedAt: true,
      },
    });

    await prisma.lineInboxItem.update({
      where: {
        id: inboxId,
      },
      data: {
        status: "published",
        error: null,
      },
    });

    return NextResponse.json({
      success: true,
      news: updatedNews,
    });
  } catch (error) {
    console.error(
      "[line/publish] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "記事の公開に失敗しました",
      },
      { status: 500 }
    );
  }
}
