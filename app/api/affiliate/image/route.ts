import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const id = Number(formData.get("id"));
    const imageCode =
      typeof formData.get("imageUrl") === "string"
        ? String(formData.get("imageUrl"))
        : "";

    if (!id || !imageCode.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "案件IDとA8広告コードを入力してください",
        },
        { status: 400 }
      );
    }

    /*
     * A8広告コードから img の src を取得
     */
    const srcMatch = imageCode.match(
      /<img[^>]+src=["']([^"']+)["']/i
    );

    if (!srcMatch) {
      /*
       * HTMLではなく画像URLを直接貼った場合にも対応
       */
      if (
        /^https?:\/\/.+/i.test(imageCode.trim()) &&
        /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(
          imageCode.trim()
        )
      ) {
        const program =
          await prisma.affiliateProgram.update({
            where: { id },
            data: {
              imageUrl: imageCode.trim(),
            },
          });

        return NextResponse.json({
          success: true,
          program,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "広告コードからバナー画像URLを取得できませんでした。A8の広告コードをそのまま貼り付けてください。",
        },
        { status: 400 }
      );
    }

    const imageUrl = srcMatch[1];

    const program =
      await prisma.affiliateProgram.update({
        where: {
          id,
        },
        data: {
          imageUrl,
        },
      });

    return NextResponse.json({
      success: true,
      program,
    });

  } catch (error) {
    console.error(
      "Affiliate image update error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "バナー画像の登録に失敗しました",
      },
      { status: 500 }
    );
  }
}
