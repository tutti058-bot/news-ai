import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const newsId = Number(
      searchParams.get("newsId")
    );

    if (!newsId) {
      return NextResponse.json(
        { error: "newsIdが必要です" },
        { status: 400 }
      );
    }

    const current = await prisma.news.findUnique({
      where: { id: newsId },
    });

    if (!current) {
      return NextResponse.json(
        { error: "記事が見つかりません" },
        { status: 404 }
      );
    }

    const recent = await prisma.news.findMany({
      where: {
        id: { not: newsId },
      },
      select: {
        id: true,
        title: true,
        sourceUrl: true,
        category: true,
        publishedAt: true,
        score: true,
        summary: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 30,
    });

    const keywords =
      (current.title ?? "")
        .replace(/[「」『』【】（）()[\]、。，．！？!?:：]/g, " ")
        .split(/\s+/)
        .filter((x) => x.length >= 2)
        .slice(0, 8);

    const scored = recent.map((item) => {
      const text =
        `${item.title} ${item.category ?? ""}`.toLowerCase();

      let score = 0;

      for (const keyword of keywords) {
        if (
          keyword &&
          text.includes(keyword.toLowerCase())
        ) {
          score += 2;
        }
      }

      if (
        item.category &&
        item.category === current.category
      ) {
        score += 3;
      }

      return {
        ...item,
        relevanceScore: score,
        score: item.score ?? 60,
      };
    });

    scored.sort(
      (a, b) => {
        // 関連度を優先し、同程度ならAI評価の高い記事を優先
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }

        return b.score - a.score;
      }
    );

    const related = scored
      .filter((item) => item.score > 0)
      .slice(0, 3);

    return NextResponse.json({
      current: {
        id: current.id,
        title: current.title,
      },
      related,
    });
  } catch (error) {
    console.error(
      "関連記事取得エラー:",
      error
    );

    return NextResponse.json(
      { error: "関連記事取得に失敗しました" },
      { status: 500 }
    );
  }
}
