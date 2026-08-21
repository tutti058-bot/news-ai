import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const programs = await prisma.affiliateProgram.findMany({
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      success: true,
      programs,
    });
  } catch (error) {
    console.error("Affiliate GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "案件の取得に失敗しました",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      name,
      programId,
      url,
      category,
      keywords,
      description,
      priority,
      isActive,
    } = body;

    if (!name || !url) {
      return NextResponse.json(
        {
          success: false,
          error: "案件名と広告リンクは必須です",
        },
        { status: 400 }
      );
    }

    const program = await prisma.affiliateProgram.create({
      data: {
        name: String(name),
        programId: programId ? String(programId) : null,
        url: String(url),
        category: category ? String(category) : null,
        keywords: keywords ? String(keywords) : null,
        description: description
          ? String(description)
          : null,
        priority: Number(priority) || 0,
        isActive:
          typeof isActive === "boolean"
            ? isActive
            : true,
      },
    });

    return NextResponse.json({
      success: true,
      program,
    });
  } catch (error) {
    console.error("Affiliate POST error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "案件の登録に失敗しました",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const {
      id,
      name,
      programId,
      url,
      category,
      keywords,
      description,
      priority,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "案件IDが指定されていません",
        },
        { status: 400 }
      );
    }

    if (!name || !url) {
      return NextResponse.json(
        {
          success: false,
          error: "案件名と広告リンクは必須です",
        },
        { status: 400 }
      );
    }

    const programIdNumber = Number(id);

    if (!Number.isInteger(programIdNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: "案件IDが不正です",
        },
        { status: 400 }
      );
    }

    const existingProgram =
      await prisma.affiliateProgram.findUnique({
        where: {
          id: programIdNumber,
        },
      });

    if (!existingProgram) {
      return NextResponse.json(
        {
          success: false,
          error: "案件が見つかりません",
        },
        { status: 404 }
      );
    }

    const program =
      await prisma.affiliateProgram.update({
        where: {
          id: programIdNumber,
        },
        data: {
          name: String(name),
          programId: programId
            ? String(programId)
            : null,
          url: String(url),
          category: category
            ? String(category)
            : null,
          keywords: keywords
            ? String(keywords)
            : null,
          description: description
            ? String(description)
            : null,
          priority: Number(priority) || 0,
          isActive:
            typeof isActive === "boolean"
              ? isActive
              : true,
        },
      });

    return NextResponse.json({
      success: true,
      program,
    });
  } catch (error) {
    console.error("Affiliate PUT error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "案件の更新に失敗しました",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "案件IDが指定されていません",
        },
        { status: 400 }
      );
    }

    const programId = Number(id);

    if (!Number.isInteger(programId)) {
      return NextResponse.json(
        {
          success: false,
          error: "案件IDが不正です",
        },
        { status: 400 }
      );
    }

    const program =
      await prisma.affiliateProgram.findUnique({
        where: {
          id: programId,
        },
      });

    if (!program) {
      return NextResponse.json(
        {
          success: false,
          error: "案件が見つかりません",
        },
        { status: 404 }
      );
    }

    await prisma.affiliateProgram.delete({
      where: {
        id: programId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "案件を削除しました",
    });
  } catch (error) {
    console.error("Affiliate DELETE error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "案件の削除に失敗しました",
      },
      { status: 500 }
    );
  }
}
