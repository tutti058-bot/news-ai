"use client";

import { Flame } from "lucide-react";
import Link from "next/link";

type TrendingNews = {
  id: number;
  title: string;
  views: number;
  trendingViews: number;
};

export default function TrendingBar({
  news,
}: {
  news: TrendingNews[];
}) {
  return (
    <section className="border-b border-slate-100 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-4 scrollbar-hide">

        <div className="flex shrink-0 items-center gap-2 rounded-full bg-red-50 px-4 py-2 font-bold text-red-600">
          <Flame size={18} />
          急上昇
        </div>

        {news.length > 0 ? (
          news.map((item, index) => (
            <Link
              key={item.id}
              href={`/news/${item.id}`}
              className="group flex min-w-[240px] shrink-0 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 transition hover:border-red-500 hover:bg-red-50"
            >
              <span className="font-black text-red-500">
                {index + 1}
              </span>

              <span className="max-w-[170px] truncate text-sm font-semibold text-slate-700 group-hover:text-red-600">
                {item.title}
              </span>

              <span className="shrink-0 text-xs font-bold text-red-500">
                ↑ {item.trendingViews}
              </span>
            </Link>
          ))
        ) : (
          <span className="text-sm text-slate-400">
            直近24時間の閲覧データを集計中…
          </span>
        )}

      </div>
    </section>
  );
}