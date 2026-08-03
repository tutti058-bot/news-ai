import { NextResponse } from "next/server";
import { fetchNews } from "@/lib/fetchNews";

export async function GET() {
  try {
    const news = await fetchNews();

    return NextResponse.json(news);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "ニュース取得失敗" },
      { status: 500 }
    );
  }
}