"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";

const menu = [
  "国内",
  "芸能",
  "スポーツ",
  "経済",
  "テクノロジー",
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">

        <Link href="/" className="flex items-center gap-3">

          
          <Image
  src="/logo02.png"
  alt="NEWS AI"
  width={190}
  height={48}
  priority
  className="h-14 w-auto"
/>

        </Link>

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

        <div className="flex items-center gap-2 lg:hidden">

          <Link
            href="/search"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"
          >
            <Search size={18} />
          </Link>

          <button
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>

        </div>

      </div>

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