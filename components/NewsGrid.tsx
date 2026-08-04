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
  const where = keyword
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
    : undefined;

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
          AIが選んだ最新ニュースをリアルタイムで表示
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {news.map((item) => (
          <NewsCard
            key={item.id}
            id={item.id}
            title={item.title}
            summary={item.summary ?? ""}
            image={item.image || "/news.jpg"}
            category={item.category ?? "国内"}
            date={
              item.publishedAt
                ? new Date(item.publishedAt).toLocaleDateString("ja-JP")
                : ""
            }
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-2 flex-wrap">
          {page > 1 && (
            <Link
              href={`/?page=${page - 1}${keyword ? `&q=${encodeURIComponent(keyword)}` : ""}`}
              className="rounded-lg border px-4 py-2 hover:bg-slate-100"
            >
              ← 前へ
            </Link>
          )}

          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;

            return (
              <Link
                key={p}
                href={`/?page=${p}${keyword ? `&q=${encodeURIComponent(keyword)}` : ""}`}
                className={`rounded-lg px-4 py-2 ${
                  p === page
                    ? "bg-blue-600 text-white"
                    : "border hover:bg-slate-100"
                }`}
              >
                {p}
              </Link>
            );
          })}

          {page < totalPages && (
            <Link href={`/?page=${page + 1}${keyword ? `&q=${encodeURIComponent(keyword)}` : ""}`}
              className="rounded-lg border px-4 py-2 hover:bg-slate-100"
            >
              次へ →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
             