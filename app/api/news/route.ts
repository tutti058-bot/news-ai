import { NextResponse } from "next/server";
import { syncNews } from "@/lib/services/news";

export async function GET() {
  try {
    const result = await syncNews();

    return NextResponse.json(result);
  } catch (error) {
    console.error("ニュース同期エラー:", error);

    const message =
      error instanceof Error
        ? error.message
        : "不明なエラーが発生しました";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}
