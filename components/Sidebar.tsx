import Link from "next/link";
import { getRanking } from "@/lib/ranking";

const medalColor = [
  "bg-yellow-500",
  "bg-gray-400",
  "bg-orange-500",
  "bg-blue-600",
  "bg-blue-600",
];

export default async function Sidebar() {
  const ranking = await getRanking();

  return (
    <aside className="space-y-8">

      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">

        <h2 className="mb-8 text-3xl font-black text-slate-900">
          🔥 AI重要度ランキング
        </h2>

        <div className="space-y-5">

          {ranking.map((item, index) => (

            <Link
              key={item.id}
              href={`/news/${item.id}`}
              className="flex items-start gap-4 border-b border-gray-100 pb-5 last:border-none"
            >

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black text-white ${medalColor[index]}`}
              >
                {index + 1}
              </div>

              <div className="flex-1">

                <div className="mb-2 inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
                  AI {item.score}点
                </div>

                <h3 className="font-bold leading-6 text-slate-900 transition hover:text-blue-600">
                  {item.title}
                </h3>

              </div>

            </Link>

          ))}

        </div>

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

      {/* 広告 */}

      <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-xl">

        <p className="text-sm font-bold uppercase tracking-[0.2em]">
          Advertisement
        </p>

        <h2 className="mt-4 text-3xl font-black">
          Google AdSense
        </h2>

        <p className="mt-4 leading-7 text-blue-100">
          このエリアにGoogle AdSense広告を表示します。
        </p>

      </div>

    </aside>
  );
}