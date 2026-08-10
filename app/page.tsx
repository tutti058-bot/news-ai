import Header from "@/components/Header";
import TrendingBar from "@/components/TrendingBar";
import HomeLayout from "@/components/HomeLayout";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
}) {
  const { q = "", page = "1" } = await searchParams;

  // 直近24時間
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 直近24時間の閲覧数を集計
  const trendingViews = await prisma.newsView.groupBy({
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
    take: 6,
  });

  // 集計結果からニュース情報を取得
  const trendingNews = await Promise.all(
    trendingViews.map(async (item) => {
      const news = await prisma.news.findUnique({
        where: {
          id: item.newsId,
        },
        select: {
          id: true,
          title: true,
          views: true,
        },
      });

      if (!news) {
        return null;
      }

      return {
        id: news.id,
        title: news.title,
        views: news.views,
        trendingViews: item._count.newsId,
      };
    })
  );

  const filteredTrendingNews = trendingNews.filter(
    (item): item is NonNullable<typeof item> => item !== null
  );

  return (
    <>
      <Header />

      <TrendingBar news={filteredTrendingNews} />

      <HomeLayout
        keyword={q}
        page={Number(page)}
      />
    </>
  );
}