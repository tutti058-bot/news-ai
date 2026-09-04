import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ColumnPreview() {
  const columns = await prisma.column.findMany({
    where: {
      isPublished: true,
    },
    orderBy: {
      publishedAt: "desc",
    },
    take: 1,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      image: true,
      publishedAt: true,
    },
  });

  if (columns.length === 0) {
    return null;
  }

  const featured = columns[0];

  return (
    <section className="mt-7 sm:mt-12">

      {/* セクションヘッダー */}
      <div className="mb-4 flex items-end justify-between sm:mb-6">

        <div>
          <p className="text-[10px] font-black tracking-[0.2em] text-blue-600 sm:text-xs sm:tracking-[0.25em]">
            AI NEWS JAPAN COLUMN
          </p>

          <h2 className="mt-1 text-xl font-black leading-tight tracking-tight text-slate-950 sm:mt-2 sm:text-3xl">
            ニュースでは、語れない話。
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
            ニュースだけでは伝えきれない、
            AI・仕事・社会・日々の出来事を独自の視点で。
          </p>
        </div>

        <Link
          href="/column"
          className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-600 sm:inline-flex"
        >
          コラム一覧 →
        </Link>

      </div>

      {/* 最新コラム */}
      <Link
        href={`/column/${featured.slug}`}
        className="group block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
      >

        {featured.image ? (
          <img
            src={featured.image}
            alt={featured.title}
            className="h-40 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-68"
          />
        ) : (
          <div className="flex h-40 items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 sm:h-68">
            <span className="text-6xl font-black text-blue-600/70">
              AI
            </span>
          </div>
        )}

        <div className="p-4 sm:p-6">

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black tracking-widest text-blue-600">
              FEATURED
            </span>

            {featured.publishedAt && (
              <span className="text-xs font-bold text-slate-400">
                {new Date(featured.publishedAt).toLocaleDateString("ja-JP")}
              </span>
            )}
          </div>

          <h3 className="mt-2 text-lg font-black leading-tight tracking-tight text-slate-950 transition group-hover:text-blue-600 sm:mt-3 sm:text-[22px]">
            {featured.title}
          </h3>

          {featured.excerpt && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 sm:mt-3 sm:line-clamp-3 sm:text-sm sm:leading-7">
              {featured.excerpt}
            </p>
          )}

          <div className="mt-4 font-black text-blue-600">
            続きを読む →
          </div>

        </div>

      </Link>

      {/* スマホ用一覧ボタン */}
      <div className="mt-4 sm:hidden">
        <Link
          href="/column"
          className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:text-blue-600"
        >
          コラムをもっと見る →
        </Link>
      </div>

    </section>
  );

}
