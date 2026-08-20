import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const columns = await prisma.column.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      columns,
    });
  } catch (error) {
    console.error("コラム取得エラー:", error);

    return NextResponse.json(
      {
        success: false,
        error: "コラムの取得に失敗しました",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const slug = String(body.slug ?? "").trim();
    const excerpt = String(body.excerpt ?? "").trim();
    const content = String(body.content ?? "").trim();
    const image = String(body.image ?? "").trim();

    const isPublished = Boolean(body.isPublished);

    if (!title || !slug || !content) {
      return NextResponse.json(
        {
          success: false,
          error: "タイトル・slug・本文は必須です",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.column.findUnique({
      where: {
        slug,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "このslugはすでに使用されています",
        },
        { status: 409 }
      );
    }

    const column = await prisma.column.create({
      data: {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        image: image || null,
        publishedAt: isPublished ? new Date() : null,
        isPublished,
      },
    });

    return NextResponse.json({
      success: true,
      column,
    });
  } catch (error) {
    console.error("コラム登録エラー:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : String(error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}


export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id);
    const title = String(body.title ?? "").trim();
    const slug = String(body.slug ?? "").trim();
    const excerpt = String(body.excerpt ?? "").trim();
    const content = String(body.content ?? "").trim();
    const image = String(body.image ?? "").trim();
    const isPublished = Boolean(body.isPublished);

    if (!Number.isInteger(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "コラムIDが不正です",
        },
        { status: 400 }
      );
    }

    if (!title || !slug || !content) {
      return NextResponse.json(
        {
          success: false,
          error: "タイトル・slug・本文は必須です",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.column.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "コラムが見つかりません",
        },
        { status: 404 }
      );
    }

    const slugOwner = await prisma.column.findUnique({
      where: {
        slug,
      },
    });

    if (slugOwner && slugOwner.id !== id) {
      return NextResponse.json(
        {
          success: false,
          error: "このslugはすでに別のコラムで使用されています",
        },
        { status: 409 }
      );
    }

    const column = await prisma.column.update({
      where: {
        id,
      },
      data: {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        image: image || null,
        isPublished,
        publishedAt: isPublished
          ? existing.publishedAt || new Date()
          : null,
      },
    });

    return NextResponse.json({
      success: true,
      column,
    });
  } catch (error) {
    console.error("コラム更新エラー:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : String(error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "コラムIDが不正です",
        },
        { status: 400 }
      );
    }

    await prisma.column.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("コラム削除エラー:", error);

    return NextResponse.json(
      {
        success: false,
        error: "コラムの削除に失敗しました",
      },
      { status: 500 }
    );
  }
}