import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET() {
  try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const news = await prisma.news.findMany({
      orderBy: {
        publishedAt: "desc",
      },
      take: 50,
      select: {
        id: true,
        title: true,
        publishedAt: true,
      },
    });

    const shares = await prisma.newsShare.groupBy({
      by: ["newsId", "type"],
      _count: {
        id: true,
      },
    });

    const result = news.map((item) => {
      const xShares =
        shares.find(
          (share) =>
            share.newsId === item.id &&
            share.type === "x"
        )?._count.id ?? 0;

      const lineShares =
        shares.find(
          (share) =>
            share.newsId === item.id &&
            share.type === "line"
        )?._count.id ?? 0;

      return {
        id: item.id,
        title: item.title,
        publishedAt: item.publishedAt,
        xShares,
        lineShares,
        totalShares: xShares + lineShares,
      };
    });

    return NextResponse.json({
      success: true,
      news: result,
    });
  } catch (error) {
    console.error("シェア集計エラー:", error);

    return NextResponse.json(
      {
        success: false,
        error: "シェア集計に失敗しました",
      },
      {
        status: 500,
      }
    );
  }
}
