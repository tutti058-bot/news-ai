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
      const getShares = (type: string) =>
        shares.find(
          (share) =>
            share.newsId === item.id &&
            share.type === type
        )?._count.id ?? 0;

      const xShares = getShares("x");
      const lineShares = getShares("line");
      const facebookShares = getShares("facebook");
      const threadsShares = getShares("threads");
      const hatenaShares = getShares("hatena");

      const totalShares =
        xShares +
        lineShares +
        facebookShares +
        threadsShares +
        hatenaShares;

      return {
        id: item.id,
        title: item.title,
        publishedAt: item.publishedAt,

        xShares,
        lineShares,
        facebookShares,
        threadsShares,
        hatenaShares,

        totalShares,
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
