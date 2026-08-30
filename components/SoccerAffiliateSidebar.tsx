"use client";

import { useEffect, useState } from "react";

type Affiliate = {
  id: number;
  name: string;
  url: string;
  imageUrl: string | null;
};

export default function SoccerAffiliateSidebar() {
  const [affiliate, setAffiliate] =
    useState<Affiliate | null>(null);

  useEffect(() => {
    async function fetchAffiliate() {
      try {
        const response = await fetch(
          "/api/affiliate?_=" + Date.now(),
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (
          data?.success &&
          Array.isArray(data.programs) &&
          data.programs.length > 0
        ) {
          const activePrograms = data.programs.filter(
            (program: Affiliate) => program
          );

          if (activePrograms.length > 0) {
            const random =
              activePrograms[
                Math.floor(
                  Math.random() * activePrograms.length
                )
              ];

            setAffiliate(random);
          }
        }
      } catch (error) {
        console.error(
          "サッカー特設ページのアフィリエイト取得エラー:",
          error
        );
      }
    }

    fetchAffiliate();
  }, []);

  if (!affiliate) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <span className="text-[10px] font-black tracking-[0.2em] text-slate-400">
          PICK UP
        </span>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-400">
          PR
        </span>
      </div>

      {affiliate.imageUrl && (
        <a
          href={affiliate.url}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="block overflow-hidden bg-white p-2"
        >
          <img
            src={affiliate.imageUrl}
            alt={affiliate.name}
            className="block h-auto w-full object-contain transition duration-300 hover:scale-[1.02]"
          />
        </a>
      )}

      <div className="px-5 py-4">
        <p className="text-sm font-black leading-6 text-slate-900">
          {affiliate.name}
        </p>

        <a
          href={affiliate.url}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700"
        >
          詳細を見る →
        </a>
      </div>
    </div>
  );
}
