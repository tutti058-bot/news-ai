"use client";

import { Flame } from "lucide-react";
import Link from "next/link";

const topics = [
  "国内",
  "経済",
  "スポーツ",
  "テクノロジー",
  "国際",
  "AI",
];

export default function TrendingBar() {
  return (
    <section className="border-b bg-white">

      <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-4 scrollbar-hide">

        <div className="flex shrink-0 items-center gap-2 rounded-full bg-red-50 px-4 py-2 font-bold text-red-600">
          <Flame size={18} />
          急上昇
        </div>

        {topics.map((topic) => (
          <Link
            key={topic}
            href={`/search?q=${encodeURIComponent(topic)}`}
            className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-600 hover:bg-blue-600 hover:text-white"
          >
            #{topic}
          </Link>
        ))}

      </div>

    </section>
  );
}