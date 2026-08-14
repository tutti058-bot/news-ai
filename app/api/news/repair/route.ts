import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getArticle } from "@/lib/getArticle";
import { analyzeArticle } from "@/lib/ai";
import { getImage } from "@/lib/getImage";
import { isAdminAuthenticated } from "@/lib/adminAuth";

const REPAIR_IDS = [650, 654, 660, 661];

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
        id: {
          in: REPAIR_IDS,
        },
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
          `修復開始: ID=${news.id} ${news.title}`
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

        const image = await getImage(cleanUrl);

        await prisma.news.update({
          where: {
            id: news.id,
          },
          data: {
            sourceUrl: cleanUrl,
            summary: ai.summary,
            category: ai.category,
            score: ai.score,
            importanceScore: ai.importanceScore,
            buzzScore: ai.buzzScore,
            impactScore: ai.impactScore,
            noveltyScore: ai.noveltyScore,
            attentionScore: ai.attentionScore,
            image,
          },
        });

        repaired++;

        console.log(
          `修復完了: ID=${news.id} ${news.title}`
        );
        console.log(
          `画像: ${image}`
        );
      } catch (error) {
        console.error(
          `修復失敗: ID=${news.id}`,
          error
        );

        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      repaired,
      failed,
      requested: REPAIR_IDS.length,
      processed: newsList.length,
    });
  } catch (error) {
    console.error(
      "記事修復エラー:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "記事修復に失敗しました",
      },
      {
        status: 500,
      }
    );
  }
}
