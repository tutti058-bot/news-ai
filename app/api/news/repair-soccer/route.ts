import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getArticle } from "@/lib/getArticle";
import { analyzeArticle } from "@/lib/ai";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET() {
  try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const newsList = await prisma.news.findMany({
      where: {
        AND: [
          {
            title: {
              contains: "試合記録",
            },
          },
          {
            score: {
              gt: 68,
            },
          },
        ],
      },
      orderBy: {
        id: "asc",
      },
    });

    let repaired = 0;
    let failed = 0;

    for (const news of newsList) {
      try {
        console.log(
          `サッカー再分析開始: ID=${news.id} ${news.title}`
        );

        const cleanUrl = news.sourceUrl.replace(
          /&#45;/g,
          "-"
        );

        const article = await getArticle(cleanUrl);

        if (!article || article.length < 300) {
          console.log(
            `本文取得失敗: ID=${news.id}`
          );
          failed++;
          continue;
        }

        const ai = await analyzeArticle(
          news.title,
          article
        );

        if (!ai.summary) {
          console.log(
            `AI分析失敗: ID=${news.id}`
          );
          failed++;
          continue;
        }

        await prisma.news.update({
          where: {
            id: news.id,
          },
          data: {
            summary: ai.summary,
            supplement: ai.supplement,
            category: ai.category,
            score: ai.score,
            importanceScore: ai.importanceScore,
            buzzScore: ai.buzzScore,
            impactScore: ai.impactScore,
            noveltyScore: ai.noveltyScore,
            attentionScore: ai.attentionScore,
          },
        });

        repaired++;

        console.log(
          `サッカー再分析完了: ID=${news.id} ${news.title} score=${ai.score}`
        );
      } catch (error) {
        console.error(
          `サッカー再分析失敗: ID=${news.id}`,
          error
        );

        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      repaired,
      failed,
      requested: newsList.length,
      processed: newsList.length,
    });
  } catch (error) {
    console.error(
      "サッカー再分析エラー:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "サッカー記事の再分析に失敗しました",
      },
      {
        status: 500,
      }
    );
  }
}
