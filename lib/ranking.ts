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

/**
 * 閲覧ランキング
 * 直近7日間の実際の閲覧数TOP3
 */
export async function getViewRanking() {
  const since = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  );

  const views = await prisma.newsView.groupBy({
    by: ["newsId"],
    where: {
      createdAt: {
        gte: since,
      },
    },
    _count: {
      newsId: true,
    },
    orderBy: {
      _count: {
        newsId: "desc",
      },
    },
    take: 3,
  });

  const news = await Promise.all(
    views.map(async (item) => {
      const article = await prisma.news.findUnique({
        where: {
          id: item.newsId,
        },
        select: {
          id: true,
          title: true,
          score: true,
          category: true,
          publishedAt: true,
        },
      });

      if (!article) {
        return null;
      }

      return {
        ...article,
        viewCount: item._count.newsId,
      };
    })
  );

  return news.filter(
    (item): item is NonNullable<typeof item> =>
      item !== null
  );
}

/**
 * サッカー重要度ランキング
 * ゲキサカまたはサッカーカテゴリの記事を対象
 * weekly = 7日間 / monthly = 30日間
 */
export async function getSoccerImportanceRanking(
  period: "weekly" | "monthly"
) {
  const days = period === "weekly" ? 7 : 30;

  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  );

  return prisma.news.findMany({
    where: {
      publishedAt: {
        gte: since,
      },
      OR: [
        {
          source: "ゲキサカ",
        },
        {
          category: "サッカー",
        },
      ],
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
    take: 3,
    select: {
      id: true,
      title: true,
      score: true,
      importanceScore: true,
      publishedAt: true,
    },
  });
}

/**
 * サッカー閲覧ランキング
 * ゲキサカまたはサッカーカテゴリの記事のみ
 * weekly = 7日間 / monthly = 30日間
 */
export async function getSoccerViewRanking(
  period: "weekly" | "monthly"
) {
  const days = period === "weekly" ? 7 : 30;

  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  );

  const views = await prisma.newsView.groupBy({
    by: ["newsId"],
    where: {
      createdAt: {
        gte: since,
      },
    },
    _count: {
      newsId: true,
    },
    orderBy: {
      _count: {
        newsId: "desc",
      },
    },
    take: 20,
  });

  const news = await Promise.all(
    views.map(async (item) => {
      const article = await prisma.news.findUnique({
        where: {
          id: item.newsId,
        },
        select: {
          id: true,
          title: true,
          source: true,
          category: true,
          score: true,
          publishedAt: true,
        },
      });

      if (!article) {
        return null;
      }

      const isSoccer =
        article.source === "ゲキサカ" ||
        article.category === "サッカー";

      if (!isSoccer) {
        return null;
      }

      return {
        ...article,
        viewCount: item._count.newsId,
      };
    })
  );

  return news
    .filter(
      (item): item is NonNullable<typeof item> =>
        item !== null
    )
    .slice(0, 5);
}
