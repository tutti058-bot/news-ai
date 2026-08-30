"use client";

import { useState } from "react";
import Link from "next/link";

type RankingItem = {
  id: number;
  title: string;
  score: number;
};

type Props = {
  weekly: RankingItem[];
  monthly: RankingItem[];
};

const medalColor = [
  "bg-yellow-500",
  "bg-gray-400",
  "bg-orange-500",
  "bg-blue-600",
  "bg-blue-600",
];

export default function RankingSwitcher({
  weekly,
  monthly,
}: Props) {
  const [isMonthly, setIsMonthly] = useState(false);

  const ranking = isMonthly ? monthly : weekly;

  return (
    <>
      <h2 className="mb-8 text-3xl font-black text-slate-900">
        🔥 AI重要度ランキング{isMonthly ? "月間" : "週間"}
      </h2>

      <div className="space-y-5">
        {ranking.map((item, index) => (
          <Link
            key={item.id}
            href={`/news/${item.id}`}
            className="flex items-start gap-4 border-b border-gray-100 pb-5 last:border-none"
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${medalColor[index] ?? "bg-blue-600"}`}
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

        {ranking.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">
            ランキング対象の記事がありません。
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5 text-right">
        <button
          type="button"
          onClick={() => setIsMonthly(!isMonthly)}
          className="whitespace-nowrap text-sm font-bold text-blue-600 transition hover:text-blue-800"
        >
          {isMonthly
            ? "週間に戻す ←"
            : "月間を見る →"}
        </button>
      </div>
    </>
  );
}
