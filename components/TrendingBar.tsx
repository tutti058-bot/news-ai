"use client";

import { Flame } from "lucide-react";

const topics = [
  "大谷翔平",
  "台風情報",
  "日経平均",
  "OpenAI",
  "サッカー日本代表",
  "芸能速報",
  "政治",
  "AI",
  "テクノロジー",
];

export default function TrendingBar() {
  return (
    <section className="rounded-full bg-slate-100 px-5 py-3 text-gray-400">
      <div className="max-w-7xl mx-auto flex items-center gap-4 px-6 py-3 overflow-x-auto scrollbar-hide">

        <div className="flex items-center gap-2 text-red-500 font-bold whitespace-nowrap">
          <Flame size={18} />
          急上昇
        </div>

        {topics.map((topic) => (
          <button
            key={topic}
            className="whitespace-nowrap rounded-full bg-slate-100 hover:bg-blue-600 hover:text-white transition px-4 py-2 text-sm font-medium"
          >
            #{topic}
          </button>
        ))}

      </div>
    </section>
  );
}