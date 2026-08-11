import { NextResponse } from "next/server";
import { syncNews } from "@/lib/services/news";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await syncNews();

    return NextResponse.json(result);
  } catch (error) {
    console.error("NEWS SYNC ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    );
  }
}