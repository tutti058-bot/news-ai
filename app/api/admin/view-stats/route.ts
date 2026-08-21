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

    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const [totalViews, todayViews] = await Promise.all([
      prisma.newsView.count(),

      prisma.newsView.count({
        where: {
          createdAt: {
            gte: startOfDay,
          },
        },
      }),
    ]);

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
