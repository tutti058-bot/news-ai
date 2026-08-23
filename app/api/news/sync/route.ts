import { NextResponse } from "next/server";
import { syncNews } from "@/lib/services/news";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  console.log("=== NEWS SYNC API START ===");

  try {
    const limitParam = new URL(request.url).searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    const result = await syncNews(
      Number.isFinite(limit) && limit && limit > 0
        ? limit
        : undefined
    );

    console.log("=== NEWS SYNC API END ===");

    return NextResponse.json(result);
  } catch (error) {
    console.error("NEWS SYNC ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}
