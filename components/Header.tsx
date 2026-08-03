"use client";

import Link from "next/link";
import { Menu, Search, Bell, Moon } from "lucide-react";

const menu = [
  "国内",
  "芸能",
  "スポーツ",
  "経済",
  "テクノロジー",
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">

      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

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
              href="#"
              className="font-semibold text-gray-700 transition hover:text-blue-600"
            >
              {item}
            </Link>

          ))}

        </nav>

        {/* Right */}

        <div className="flex items-center gap-3">

          <button className="hidden md:flex items-center gap-2 rounded-full bg-slate-100 px-5 py-3 transition hover:bg-blue-600 hover:text-white">

            <Search size={18} />

            <span className="text-sm font-medium">

              検索

            </span>

          </button>

                    <button className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 transition hover:bg-blue-600 hover:text-white">
            <Bell size={20} />
          </button>

          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 transition hover:bg-blue-600 hover:text-white">
            <Moon size={20} />
          </button>

          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 transition hover:bg-blue-600 hover:text-white lg:hidden">
            <Menu size={20} />
          </button>

        </div>

      </div>

    </header>
  );
}