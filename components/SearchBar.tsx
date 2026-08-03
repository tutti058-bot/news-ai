"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");

  return (
    <div className="mb-8 flex gap-3">
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="ニュースを検索..."
        className="flex-1 rounded-xl border p-4"
      />

      <button
        onClick={() => {
          if (!keyword) return;
          router.push(`/search?q=${encodeURIComponent(keyword)}`);
        }}
        className="rounded-xl bg-blue-600 px-6 text-white font-bold"
      >
        検索
      </button>
    </div>
  );
}