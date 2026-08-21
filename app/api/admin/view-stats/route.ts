import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/adminAuth";
export const dynamic = "force-dynamic";

export const revalidate = 60;

export async function GET() {
  try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const totalViews = await prisma.newsView.count();

    return NextResponse.json({
      success: true,
      totalViews,
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
