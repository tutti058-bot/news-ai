import TrendingBar from "@/components/TrendingBar";
import HomeLayout from "@/components/HomeLayout";
import Link from "next/link";
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

  // 公開済みコラムを最新3件取得
  const columns = await prisma.column.findMany({
    where: {
      isPublished: true,
    },
    orderBy: {
      publishedAt: "desc",
    },
    take: 3,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      image: true,
      publishedAt: true,
    },
  });

  return (
    <>
      <TrendingBar news={filteredTrendingNews} />

      <HomeLayout
        keyword={q}
        page={Number(page)}
      />

      {/* コラム */}
      <section className="mx-auto mt-10 max-w-7xl px-4 pb-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-blue-600">
              AI NEWS ジャパン
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-900">
              📝 コラム
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              ニュースだけでは伝えきれない、AI・仕事・人生についての独自読み物。
            </p>
          </div>

          <Link
            href="/column"
            className="shrink-0 text-sm font-bold text-blue-600 hover:text-blue-800"
          >
            コラムをもっと見る →
          </Link>
        </div>

        {columns.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            公開中のコラムはありません。
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {columns.map((column) => (
              <Link
                key={column.id}
                href={`/column/${column.slug}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                {column.image ? (
                  <img
                    src={column.image}
                    alt={column.title}
                    className="h-48 w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-48 w-full items-center justify-center bg-slate-100 text-4xl">
                    📝
                  </div>
                )}

                <div className="p-5">
                  <p className="text-xs font-bold text-blue-600">
                    COLUMN
                  </p>

                  <h3 className="mt-2 line-clamp-2 text-lg font-black leading-relaxed text-slate-900 group-hover:text-blue-600">
                    {column.title}
                  </h3>

                  {column.excerpt && (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-500">
                      {column.excerpt}
                    </p>
                  )}

                  <p className="mt-4 text-xs text-slate-400">
                    {column.publishedAt
                      ? new Date(column.publishedAt).toLocaleDateString(
                          "ja-JP"
                        )
                      : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}