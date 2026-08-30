import Link from "next/link";
import { getImportanceRanking } from "@/lib/ranking";
import RankingSwitcher from "./RankingSwitcher";
import { prisma } from "@/lib/prisma";

const medalColor = [
  "bg-yellow-500",
  "bg-gray-400",
  "bg-orange-500",
  "bg-blue-600",
  "bg-blue-600",
];

export default async function Sidebar() {
  const weeklyRanking = await getImportanceRanking("weekly");
  const monthlyRanking = await getImportanceRanking("monthly");

  const rankingData = (items: typeof weeklyRanking) =>
    items.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.title,
      score: item.score,
    }));

  const affiliatePrograms =
    await prisma.affiliateProgram.findMany({
      where: {
        isActive: true,
      },
    });

  const randomAffiliate =
    affiliatePrograms.length > 0
      ? affiliatePrograms[
          Math.floor(
            Math.random() * affiliatePrograms.length
          )
        ]
      : null;

  return (
    <aside className="space-y-8">

      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">
        <RankingSwitcher
          weekly={rankingData(weeklyRanking)}
          monthly={rankingData(monthlyRanking)}
        />
      </div>
      {/* カテゴリー */}

      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">

        <h2 className="mb-6 text-3xl font-black text-slate-900">
          📂 カテゴリー
        </h2>

        <div className="flex flex-wrap gap-3">

          {[
  "国内",
  "国際",
  "経済",
  "スポーツ",
  "芸能",
  "テクノロジー",
].map((category) => (

  <Link
    key={category}
    href={`/category/${encodeURIComponent(category)}`}
    className="rounded-full border border-slate-200 bg-slate-100 px-5 py-3 font-bold text-slate-900 transition hover:bg-blue-600 hover:text-white"
  >
    {category}
  </Link>

))}

        </div>

      </div>

            {/* ランダムアフィリエイト広告 */}
      {randomAffiliate && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <span className="text-[10px] font-black tracking-[0.2em] text-slate-400">
              PICK UP
            </span>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-400">
              PR
            </span>
          </div>

          {randomAffiliate.imageUrl && (
            <a
              href={randomAffiliate.url}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              className="block overflow-hidden bg-white p-2"
            >
              <img
                src={randomAffiliate.imageUrl}
                alt={randomAffiliate.name}
                className="block h-auto w-full object-contain transition duration-300 hover:scale-[1.02]"
              />
            </a>
          )}

          <div className="px-5 py-4">
            <p className="text-sm font-black leading-6 text-slate-900">
              {randomAffiliate.name}
            </p>

            <a
              href={randomAffiliate.url}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700"
            >
              詳細を見る →
            </a>
          </div>

        </div>
      )}

      {/* やんすAI 公式X */}
      <div className="rounded-3xl border border-slate-200 bg-black p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <img
            src="/yansu-x.png"
            alt="やんすAI"
            className="h-11 w-11 rounded-full object-cover"
          />

          <div>
            <p className="text-xs font-bold tracking-wide text-slate-300">
              公式X
            </p>
            <h2 className="text-xl font-black">
              やんすAI
            </h2>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-300">
          AI NEWS ジャパンの最新ニュースを
          やんすAIがお届けするでやんす。
        </p>

        <a
          href="https://x.com/news_ai_tutti"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-slate-200"
        >
          𝕏 をフォローする →
        </a>
      </div>

    </aside>
  );
}