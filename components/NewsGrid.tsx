import Link from "next/link";
import NewsCard from "./NewsCard";
import { prisma } from "@/lib/prisma";

interface NewsGridProps {
  keyword?: string;
  page: number;
}

const PER_PAGE = 10;

export default async function NewsGrid({
  keyword = "",
  page,
}: NewsGridProps) {
  const searchWhere = keyword
    ? {
        OR: [
          {
            title: {
              contains: keyword,
            },
          },
          {
            summary: {
              contains: keyword,
            },
          },
        ],
      }
    : null;

  // サッカー記事は通常ページでは75点以上のみ表示
  // 現在はゲキサカの記事をサッカー記事として判定
  const where = {
    AND: [
      ...(searchWhere ? [searchWhere] : []),
      {
        OR: [
          {
            source: {
              not: "ゲキサカ",
            },
          },
          {
            score: {
              gte: 75,
            },
          },
        ],
      },
    ],
  };

  const total = await prisma.news.count({
    where,
  });

  const news = await prisma.news.findMany({
    where,
    orderBy: {
      publishedAt: "desc",
    },
    skip: (page - 1) * PER_PAGE,
    take: PER_PAGE,
  });

  const totalPages = Math.ceil(total / PER_PAGE);

  const start = (page - 1) * PER_PAGE + 1;
  const end = Math.min(page * PER_PAGE, total);

  return (
    <section>
      <div className="mb-10">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
          LATEST NEWS
        </p>

        <h2 className="mt-2 text-4xl font-black text-slate-900">
          最新ニュース
        </h2>

        <p className="mt-2 text-slate-600">
          全{total}件中 {start}〜{end}件を表示
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:gap-8">
        {news.map((item) => (
          <NewsCard
            key={item.id}
            id={item.id}
            title={item.title}
            summary={item.summary ?? ""}
            image={item.image || "/news.jpg"}
            category={item.category ?? "国内"}
            score={item.score ?? 60}
            date={
              item.publishedAt
                ? new Date(item.publishedAt).toLocaleDateString("ja-JP")
                : ""
            }
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/?page=${page - 1}${keyword ? `&q=${encodeURIComponent(keyword)}` : ""}`}
              className="rounded-xl border px-5 py-3 font-semibold transition hover:bg-slate-100"
            >
              ← 前へ
            </Link>
          )}

                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
            let p = page;

            if (page <= 3) {
              p = i + 1;
            } else if (page >= totalPages - 2) {
              p = totalPages - 4 + i;
            } else {
              p = page - 2 + i;
            }

            if (p < 1 || p > totalPages) return null;

            return (
              <Link
                key={p}
                href={`/?page=${p}${keyword ? `&q=${encodeURIComponent(keyword)}` : ""}`}
                className={`rounded-xl px-5 py-3 font-semibold transition ${
                  p === page
                    ? "bg-blue-600 text-white"
                    : "border hover:bg-slate-100"
                }`}
              >
                {p}
              </Link>
            );
          })}

          {page < totalPages - 2 && (
            <>
              <span className="px-2 text-slate-500">…</span>

              <Link
                href={`/?page=${totalPages}${keyword ? `&q=${encodeURIComponent(keyword)}` : ""}`}
                className="rounded-xl border px-5 py-3 font-semibold transition hover:bg-slate-100"
              >
                {totalPages}
              </Link>
            </>
          )}

          {page < totalPages && (
            <Link
              href={`/?page=${page + 1}${keyword ? `&q=${encodeURIComponent(keyword)}` : ""}`}
              className="rounded-xl border px-5 py-3 font-semibold transition hover:bg-slate-100"
            >
              次へ →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}