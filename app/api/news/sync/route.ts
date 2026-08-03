import { NextRequest, NextResponse } from "next/server";
import { syncNews } from "@/lib/services/news";

export async function GET(req: NextRequest) {
  try {
    // Vercel Cronのみ許可
    const cronSecret = process.env.CRON_SECRET;
    const auth = req.headers.get("authorization");

    if (cronSecret && auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await syncNews();

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}