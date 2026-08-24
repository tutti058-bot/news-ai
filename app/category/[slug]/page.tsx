import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewsCard from "@/components/NewsCard";
import type { Metadata } from "next";

type Props = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = decodeURIComponent(slug);

  return {
    title: `${category}ニュース`,
    description:
      `${category}に関する最新ニュースをAIがわかりやすくお届けします。`,
  };
}

const categories = [
  "国内",
  "芸能",
  "スポーツ",
  "経済",
  "テクノロジー",
];

const PER_PAGE = 12;

export default async function CategoryPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const { page } = await searchParams;

  const category = decodeURIComponent(slug);

  const currentPage = Math.max(
    1,
    Number.parseInt(page ?? "1", 10) || 1
  );

  const total = await prisma.news.count({
    where: {
      category,
    },
  });

  const totalPages = Math.ceil(total / PER_PAGE);

  const safePage =
    totalPages > 0
      ? Math.min(currentPage, totalPages)
      : 1;

  const news = await prisma.news.findMany({
    where: {
      category,
    },
    orderBy: {
      publishedAt: "desc",
    },
    skip: (safePage - 1) * PER_PAGE,
    take: PER_PAGE,
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-sm font-bold text-blue-600">
          AI NEWS ジャパン
        </p>

        <h1 className="mt-2 text-4xl font-black text-slate-900">
          {category}ニュース
        </h1>

        <p className="mt-3 text-slate-500">
          {category}に関する最新ニュースをAIがわかりやすくお届けします。
        </p>
      </div>

      <nav className="sticky top-0 z-30 mt-8 flex gap-2 overflow-x-auto bg-white py-3 pb-2">
        {categories.map((item) => {
          const active = item === category;

          return (
            <Link
              key={item}
              href={`/category/${encodeURIComponent(item)}`}
              className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {item}
            </Link>
          );
        })}
      </nav>

      {news.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-lg font-bold text-slate-700">
            {category}のニュースはまだありません。
          </p>

          <p className="mt-2 text-sm text-slate-500">
            最新ニュースが追加されると、こちらに表示されます。
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {news.map((item) => (
              <NewsCard
                key={item.id}
                id={item.id}
                title={item.title}
                summary={item.summary ?? ""}
                image={item.image ?? "/news.jpg"}
                category={item.category ?? "国内"}
                score={item.score ?? 60}
                date={
                  item.publishedAt
                    ? item.publishedAt.toLocaleDateString("ja-JP")
                    : ""
                }
              />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="mt-12 flex flex-wrap items-center justify-center gap-2">
              {safePage > 1 && (
                <Link
                  href={`/category/${encodeURIComponent(category)}?page=${safePage - 1}`}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
                >
                  ← 前へ
                </Link>
              )}

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              ).map((pageNumber) => (
                <Link
                  key={pageNumber}
                  href={`/category/${encodeURIComponent(category)}?page=${pageNumber}`}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                    pageNumber === safePage
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {pageNumber}
                </Link>
              ))}

              {safePage < totalPages && (
                <Link
                  href={`/category/${encodeURIComponent(category)}?page=${safePage + 1}`}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
                >
                  次へ →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </main>
  );
}