import { prisma } from "@/lib/prisma";

/**
 * 既存サイドバー用ランキング
 * 直近7日間の記事を総合スコア順で取得
 */
export async function getRanking() {
  const since = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  );

  return prisma.news.findMany({
    where: {
      publishedAt: {
        gte: since,
      },
    },
    orderBy: [
      {
        score: "desc",
      },
      {
        publishedAt: "desc",
      },
    ],
    take: 5,
    select: {
      id: true,
      title: true,
      score: true,
      publishedAt: true,
    },
  });
}

/**
 * AI重要度ランキング
 * weekly = 直近7日間
 * monthly = 直近30日間
 */
type RankingPeriod = "weekly" | "monthly";

export async function getImportanceRanking(
  period: RankingPeriod
) {
  const days =
    period === "weekly" ? 7 : 30;

  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  );

  return prisma.news.findMany({
    where: {
      publishedAt: {
        gte: since,
      },
    },
    orderBy: [
      {
        importanceScore: "desc",
      },
      {
        score: "desc",
      },
      {
        publishedAt: "desc",
      },
    ],
    take: 20,
    select: {
      id: true,
      title: true,
      summary: true,
      image: true,
      category: true,
      score: true,
      importanceScore: true,
      publishedAt: true,
    },
  });
}
