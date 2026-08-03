"use client";

import Link from "next/link";
import { Menu, Search } from "lucide-react";

const menu = [
  "国内",
  "芸能",
  "スポーツ",
  "経済",
  "テクノロジー",
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-black text-white">
            N
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight">
              NEWS AI
            </h1>

            <p className="text-xs text-gray-500">
              AI News Platform
            </p>
          </div>
        </Link>

        {/* Menu */}
        <nav className="hidden lg:flex items-center gap-8">
          {menu.map((item) => (
            <Link
              key={item}
              href={`/search?q=${encodeURIComponent(item)}`}
              className="font-semibold text-gray-700 transition hover:text-blue-600"
            >
              {item}
            </Link>
          ))}
        </nav>

        {/* Search + Mobile Menu */}
        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="hidden items-center gap-2 rounded-full bg-slate-100 px-5 py-3 transition hover:bg-blue-600 hover:text-white md:flex"
          >
            <Search size={18} />
            <span className="text-sm font-medium">
              検索
            </span>
          </Link>

          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 transition hover:bg-blue-600 hover:text-white lg:hidden">
            <Menu size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}