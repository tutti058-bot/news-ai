"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export default function SearchBar() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");

  const search = () => {
    if (!keyword.trim()) return;
    router.push(`/search?q=${encodeURIComponent(keyword.trim())}`);
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-center rounded-2xl border border-slate-200 bg-white shadow-sm transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">

        <Search
          size={20}
          className="ml-5 text-slate-400"
        />

        <input
  type="text"
  value={keyword}
  onChange={(e) => setKeyword(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") search();
  }}
  placeholder="ニュース・キーワードを検索..."
  className="h-14 flex-1 bg-transparent px-4 text-base text-slate-900 placeholder:text-slate-500 outline-none"
/>

        <button
          onClick={search}
          className="m-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700"
        >
          検索
        </button>

      </div>
    </div>
  );
}