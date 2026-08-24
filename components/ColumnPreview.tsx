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
    take: 4,
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

  const [featured, ...others] = columns;

  return (
    <section className="mt-12">

      {/* セクションヘッダー */}
      <div className="mb-6 flex items-end justify-between">

        <div>
          <p className="text-xs font-black tracking-[0.25em] text-blue-600">
            AI NEWS JAPAN COLUMN
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            ニュースでは、語れない話。
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
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
            className="h-64 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-80"
          />
        ) : (
          <div className="flex h-64 items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 sm:h-80">
            <span className="text-6xl font-black text-blue-600/70">
              AI
            </span>
          </div>
        )}

        <div className="p-6 sm:p-8">

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

          <h3 className="mt-4 text-2xl font-black leading-tight tracking-tight text-slate-950 transition group-hover:text-blue-600 sm:text-3xl">
            {featured.title}
          </h3>

          {featured.excerpt && (
            <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-500">
              {featured.excerpt}
            </p>
          )}

          <div className="mt-5 font-black text-blue-600">
            続きを読む →
          </div>

        </div>

      </Link>

      {/* サブコラム */}
      {others.length > 0 && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

          {others.map((column) => (
            <Link
              key={column.id}
              href={`/column/${column.slug}`}
              className="group flex min-h-32 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >

              {column.image ? (
                <img
                  src={column.image}
                  alt={column.title}
                  className="h-32 w-24 shrink-0 object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-32 w-24 shrink-0 items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 text-2xl font-black text-blue-600">
                  AI
                </div>
              )}

              <div className="flex min-w-0 flex-1 items-center p-4">

                <h3 className="line-clamp-3 text-base font-black leading-relaxed text-slate-900 transition group-hover:text-blue-600">
                  {column.title}
                </h3>

              </div>

            </Link>
          ))}

        </div>
      )}

      {/* スマホ用一覧ボタン */}
      <div className="mt-5 sm:hidden">
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
