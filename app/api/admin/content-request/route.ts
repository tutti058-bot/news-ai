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

  try {
    const requests =
      await prisma.contentRequest.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
        select: {
          id: true,
          name: true,
          message: true,
          status: true,
          createdAt: true,
        },
      });

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error(
      "Content request GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "リクエスト一覧の取得に失敗しました",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const id = Number(body.id);
    const status = String(body.status ?? "");

    if (!Number.isInteger(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "リクエストIDが不正です",
        },
        { status: 400 }
      );
    }

    if (!["pending", "done", "rejected"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "ステータスが不正です",
        },
        { status: 400 }
      );
    }

    const updated =
      await prisma.contentRequest.update({
        where: { id },
        data: { status },
        select: {
          id: true,
          name: true,
          message: true,
          status: true,
          createdAt: true,
        },
      });

    return NextResponse.json({
      success: true,
      request: updated,
    });
  } catch (error) {
    console.error(
      "Content request PUT error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "ステータスの更新に失敗しました",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } =
      new URL(request.url);

    const id = Number(
      searchParams.get("id")
    );

    if (!Number.isInteger(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "リクエストIDが不正です",
        },
        { status: 400 }
      );
    }

    await prisma.contentRequest.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Content request DELETE error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "リクエストの削除に失敗しました",
      },
      { status: 500 }
    );
  }
}
