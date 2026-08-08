"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import SearchBar from "./SearchBar";

const menu = [
  "国内",
  "芸能",
  "スポーツ",
  "経済",
  "テクノロジー",
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">

        {/* ロゴ */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo02.png"
            alt="AI News ジャパン"
            width={190}
            height={48}
            priority
            className="h-14 w-auto"
          />
        </Link>

        {/* PCメニュー */}
        <nav className="hidden lg:flex items-center gap-7">
          {menu.map((item) => (
            <Link
              key={item}
              href={`/search?q=${encodeURIComponent(item)}`}
              className="font-semibold text-slate-700 transition hover:text-blue-600"
            >
              {item}
            </Link>
          ))}
        </nav>

        {/* PC検索 */}
        <form
          action="/search"
          className="hidden md:flex items-center rounded-full bg-slate-100 px-4 py-2"
        >
          <Search size={18} />

          <input
            type="text"
            name="q"
            placeholder="ニュース検索..."
            className="ml-2 w-44 bg-transparent outline-none"
          />

          <button
            type="submit"
            className="ml-3 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            検索
          </button>
        </form>

        {/* スマホ */}
        <div className="flex items-center gap-2 lg:hidden">

          {/* 検索ボタン */}
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"
            aria-label="検索"
          >
            {searchOpen ? <X size={20} /> : <Search size={18} />}
          </button>

          {/* メニューボタン */}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"
            aria-label="メニュー"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>

        </div>
      </div>

      {/* スマホ検索 */}
      {searchOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <SearchBar />
        </div>
      )}

      {/* スマホメニュー */}
      {open && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-4">
            {menu.map((item) => (
              <Link
                key={item}
                href={`/search?q=${encodeURIComponent(item)}`}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-blue-600"
              >
                {item}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}