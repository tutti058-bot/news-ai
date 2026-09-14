import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const items = await prisma.lineInboxItem.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      messageId: true,
      type: true,
      text: true,
      sourceUrl: true,
      imageUrl: true,
      status: true,
      error: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    items,
  });
}


export async function DELETE(request: Request) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    if (!Number.isInteger(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "LINE受信IDが不正です",
        },
        { status: 400 }
      );
    }

    const item = await prisma.lineInboxItem.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error: "LINE受信データが見つかりません",
        },
        { status: 404 }
      );
    }

    await prisma.lineInboxItem.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      id,
    });
  } catch (error) {
    console.error(
      "LINE inbox DELETE error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "LINE受信データの削除に失敗しました",
      },
      { status: 500 }
    );
  }
}
