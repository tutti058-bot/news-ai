import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "画像ファイルがありません",
        },
        { status: 400 }
      );
    }

    const allowedTypes: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };

    const extension = allowedTypes[file.type];

    if (!extension) {
      return NextResponse.json(
        {
          success: false,
          error: "JPG・PNG・WebP画像のみアップロードできます",
        },
        { status: 400 }
      );
    }

    // 10MBまで
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: "画像サイズは10MB以下にしてください",
        },
        { status: 400 }
      );
    }

    const fileName = `${randomUUID()}${extension}`;

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "column-images"
    );

    await mkdir(uploadDir, {
      recursive: true,
    });

    const filePath = path.join(uploadDir, fileName);

    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    await writeFile(filePath, buffer);

    const url = `/column-images/${fileName}`;

    return NextResponse.json({
      success: true,
      url,
    });
  } catch (error) {
    console.error("コラム画像アップロードエラー:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "画像のアップロードに失敗しました",
      },
      { status: 500 }
    );
  }
}
