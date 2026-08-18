import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const category =
      searchParams.get("category")?.trim() ?? "";

    const keywords =
      searchParams.get("keywords")?.trim() ?? "";

    const keywordList = keywords
      .split(",")
      .map((keyword) => keyword.trim().toLowerCase())
      .filter(Boolean);

    const programs =
      await prisma.affiliateProgram.findMany({
        where: {
          isActive: true,
        },
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" },
        ],
      });

    const scoredPrograms = programs.map((program) => {
      let score = program.priority;

      // カテゴリー一致
      if (
        category &&
        program.category &&
        program.category === category
      ) {
        score += 30;
      }

      // キーワード一致
      const programKeywords = (program.keywords ?? "")
        .split(",")
        .map((keyword) =>
          keyword.trim().toLowerCase()
        )
        .filter(Boolean);

      for (const newsKeyword of keywordList) {
        for (const programKeyword of programKeywords) {
          if (
            newsKeyword === programKeyword ||
            newsKeyword.includes(programKeyword) ||
            programKeyword.includes(newsKeyword)
          ) {
            score += 10;
          }
        }
      }

      // ニュースカテゴリーと案件キーワードの一致
      if (
        category &&
        programKeywords.some(
          (keyword) =>
            keyword.includes(category.toLowerCase()) ||
            category
              .toLowerCase()
              .includes(keyword)
        )
      ) {
        score += 15;
      }

      return {
        ...program,
        recommendationScore: score,
      };
    });

    scoredPrograms.sort(
      (a, b) =>
        b.recommendationScore -
        a.recommendationScore
    );

    return NextResponse.json({
      success: true,
      programs: scoredPrograms.slice(0, 3),
    });
  } catch (error) {
    console.error(
      "Affiliate recommend error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "おすすめ案件の取得に失敗しました",
      },
      { status: 500 }
    );
  }
}