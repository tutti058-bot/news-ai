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

    const now = new Date();

    // 今日 0:00
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // 昨日 0:00
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    // 過去7日間
    const startOf7Days = new Date(startOfToday);
    startOf7Days.setDate(startOf7Days.getDate() - 6);

    // 今月1日 0:00
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    // 累計
    const totalViews = await prisma.newsView.count();

    // 今日
    const todayViews = await prisma.newsView.count({
      where: {
        createdAt: {
          gte: startOfToday,
        },
      },
    });

    // 昨日
    const yesterdayViews = await prisma.newsView.count({
      where: {
        createdAt: {
          gte: startOfYesterday,
          lt: startOfToday,
        },
      },
    });

    // 過去7日
    const last7DaysViews = await prisma.newsView.count({
      where: {
        createdAt: {
          gte: startOf7Days,
        },
      },
    });

    // 今月
    const thisMonthViews = await prisma.newsView.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    return NextResponse.json({
      success: true,
      totalViews,
      todayViews,
      yesterdayViews,
      last7DaysViews,
      thisMonthViews,
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
