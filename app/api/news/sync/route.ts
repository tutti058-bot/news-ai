import { NextResponse } from "next/server";
import { syncNews } from "@/lib/services/news";

export async function GET() {
  try {
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