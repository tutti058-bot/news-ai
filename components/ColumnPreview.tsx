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
            読み物としてのAI NEWS
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

      {/* コラム */}
      <div className="grid gap-5 lg:grid-cols-5">

        {/* 注目コラム */}
        <Link
          href={`/column/${featured.slug}`}
          className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl lg:col-span-3"
        >

          {featured.image ? (
            <img
              src={featured.image}
              alt={featured.title}
              className="h-64 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-72"
            />
          ) : (
            <div className="relative flex h-64 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-100 sm:h-72">

              <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-blue-100/60 blur-3xl" />

              <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-slate-200/70 blur-3xl" />

              <div className="relative text-center">
                <div className="text-6xl font-black tracking-tight text-blue-600/80">
                  AI
                </div>

                <div className="mt-2 text-[10px] font-black tracking-[0.4em] text-slate-400">
                  AI NEWS JAPAN
                </div>
              </div>

            </div>
          )}

          <div className="p-6 sm:p-7">

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

            <div className="mt-6 font-black text-blue-600">
              続きを読む →
            </div>

          </div>

        </Link>

        {/* 2・3件目 */}
        <div className="grid gap-5 lg:col-span-2">

          {others.map((column) => (
            <Link
              key={column.id}
              href={`/column/${column.slug}`}
              className="group flex overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >

              {column.image ? (
                <img
                  src={column.image}
                  alt={column.title}
                  className="h-full min-h-40 w-32 shrink-0 object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex min-h-40 w-32 shrink-0 items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 text-3xl">
                  AI
                </div>
              )}

              <div className="min-w-0 p-5">

                <p className="text-[10px] font-black tracking-[0.2em] text-blue-600">
                  COLUMN
                </p>

                <h3 className="mt-2 line-clamp-2 text-lg font-black leading-relaxed text-slate-900 transition group-hover:text-blue-600">
                  {column.title}
                </h3>

                {column.excerpt && (
                  <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-500">
                    {column.excerpt}
                  </p>
                )}

                {column.publishedAt && (
                  <p className="mt-3 text-[11px] font-bold text-slate-400">
                    {new Date(column.publishedAt).toLocaleDateString("ja-JP")}
                  </p>
                )}

              </div>

            </Link>
          ))}

        </div>

      </div>

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
