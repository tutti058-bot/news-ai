"use client";

import { useState } from "react";
import Link from "next/link";

type ViewItem = {
  id: number;
  title: string;
  viewCount: number;
};

type Props = {
  viewsWeekly: ViewItem[];
  viewsMonthly: ViewItem[];
};

const medalColor = [
  "bg-yellow-500",
  "bg-gray-400",
  "bg-orange-500",
];

export default function SoccerRankingSidebar({
  viewsWeekly,
  viewsMonthly,
}: Props) {
  const [viewsMonthlyMode, setViewsMonthlyMode] =
    useState(false);

  const viewsRanking = (
    viewsMonthlyMode ? viewsMonthly : viewsWeekly
  ).slice(0, 5);

  return (
    <aside>
      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-slate-900">
            👀 閲覧 RANKING
          </h2>

          <div className="mt-1 text-center text-lg font-black text-slate-400">
            {viewsMonthlyMode ? "月間" : "週間"}
          </div>
        </div>

        <div className="space-y-5">
          {viewsRanking.map((item, index) => (
            <Link
              key={item.id}
              href={`/news/${item.id}`}
              className="flex items-start gap-4 border-b border-gray-100 pb-5 last:border-none"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${
                  medalColor[index] ?? "bg-blue-600"
                }`}
              >
                {index + 1}
              </div>

              <div className="flex-1">
                <div className="mb-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  VIEW {item.viewCount}
                </div>

                <h3 className="font-bold leading-6 text-slate-900 transition hover:text-blue-600">
                  {item.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>

        {viewsRanking.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-500">
            閲覧ランキング対象の記事がありません。
          </p>
        )}

        <div className="mt-6 border-t border-slate-100 pt-5 text-right">
          <button
            type="button"
            onClick={() =>
              setViewsMonthlyMode(!viewsMonthlyMode)
            }
            className="whitespace-nowrap text-sm font-bold text-blue-600 transition hover:text-blue-800"
          >
            {viewsMonthlyMode
              ? "週間に戻す ←"
              : "月間を見る →"}
          </button>
        </div>
      </div>
    </aside>
  );
}
