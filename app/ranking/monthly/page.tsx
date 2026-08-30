import Link from "next/link";
import { getImportanceRanking } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export default async function MonthlyRankingPage() {
  const ranking = await getImportanceRanking("monthly");

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

        <div className="mb-8">
          <p className="text-sm font-bold tracking-[0.2em] text-blue-600">
            AI NEWS JAPAN RANKING
          </p>

          <h1 className="mt-2 text-4xl font-black text-slate-900">
            🔥 AI重要度ランキング月間
          </h1>

          <p className="mt-3 text-slate-600">
            AIが分析したニュースの重要度をもとに、
            直近30日間の記事をランキング形式で紹介します。
          </p>
        </div>

        <div className="mb-8 flex gap-3">
          <Link
            href="/ranking/weekly"
            className="rounded-full border border-slate-300 bg-white px-5 py-2 font-bold text-slate-700 transition hover:bg-slate-50"
          >
            週間ランキング
          </Link>

          <Link
            href="/ranking/monthly"
            className="rounded-full bg-blue-600 px-5 py-2 font-bold text-white"
          >
            月間ランキング
          </Link>
        </div>

        <div className="space-y-4">
          {ranking.map((item, index) => (
            <Link
              key={item.id}
              href={`/news/${item.id}`}
              className="group block rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex gap-4">

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-2xl font-black text-white">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-blue-50 px-3 py-1 font-bold text-blue-600">
                      {item.category ?? "ニュース"}
                    </span>

                    <span className="font-bold text-orange-500">
                      AI重要度 {item.importanceScore}
                    </span>

                    <span className="text-slate-400">
                      総合スコア {item.score}
                    </span>
                  </div>

                  <h2 className="mt-3 text-lg font-bold leading-relaxed text-slate-900 group-hover:text-blue-600">
                    {item.title}
                  </h2>

                  {item.summary && (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                      {item.summary}
                    </p>
                  )}

                  <p className="mt-3 text-xs text-slate-400">
                    {item.publishedAt
                      ? new Date(
                          item.publishedAt
                        ).toLocaleDateString("ja-JP")
                      : ""}
                  </p>

                </div>

              </div>
            </Link>
          ))}
        </div>

        {ranking.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-500">
            月間ランキングの記事はまだありません。
          </div>
        )}

      </div>
    </main>
  );
}
