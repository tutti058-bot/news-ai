import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // サイト全体の閲覧数
    const totalViews = await prisma.newsView.count();

    // 今日の0:00
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 今日の閲覧数
    const todayViews = await prisma.newsView.count({
      where: {
        createdAt: {
          gte: startOfToday,
        },
      },
    });

    return NextResponse.json({
      success: true,
      totalViews,
      todayViews,
    });
  } catch (error) {
    console.error("閲覧数取得エラー:", error);

    return NextResponse.json(
      {
        success: false,
        error: "閲覧数の取得に失敗しました",
      },
      { status: 500 }
    );
  }
}
