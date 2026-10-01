import { NextResponse } from "next/server";
import {
  generateXImageBase64,
  type XImagePostType,
} from "@/lib/services/x-image";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const newsId = Number(body.newsId);
    const imagePostType = String(
      body.imagePostType ?? "standard"
    ) as XImagePostType;

    if (!newsId) {
      return NextResponse.json(
        { error: "newsIdが必要です" },
        { status: 400 }
      );
    }

    const result = await generateXImageBase64(
      newsId,
      imagePostType
    );

    return NextResponse.json({
      image: `data:${result.mimeType};base64,${result.base64}`,
    });
  } catch (error) {
    console.error("X画像生成エラー:", error);

    return NextResponse.json(
      { error: "X画像の生成に失敗しました" },
      { status: 500 }
    );
  }
}
