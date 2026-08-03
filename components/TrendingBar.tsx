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
    <section className="rounded-full bg-slate-100 px-5 py-3 text-gray-500">
      <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto px-6 py-3">

        <div className="flex items-center gap-2 whitespace-nowrap font-bold text-red-500">
          <Flame size={18} />
          急上昇
        </div>

        {topics.map((topic) => (
          <Link
            key={topic}
            href={`/search?q=${encodeURIComponent(topic)}`}
            className="whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-semibold shadow transition hover:bg-blue-600 hover:text-white"
          >
            #{topic}
          </Link>
        ))}

      </div>
    </section>
  );
}