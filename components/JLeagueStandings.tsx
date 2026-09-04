"use client";

import { useEffect, useState } from "react";
import type {
  JLeagueStanding,
  LeagueType,
} from "@/lib/jLeagueStandings";

const leagues: { key: LeagueType; label: string }[] = [
  { key: "j1", label: "J1" },
  { key: "j2", label: "J2" },
  { key: "j3", label: "J3" },
];

const officialUrls: Record<LeagueType, string> = {
  j1: "https://www.jleague.jp/j1/standings/",
  j2: "https://www.jleague.jp/j2/standings/",
  j3: "https://www.jleague.jp/j3/standings/",
};

const rankColors = [
  "bg-yellow-500",
  "bg-gray-400",
  "bg-orange-500",
];

export default function JLeagueStandings() {
  const [selectedLeague, setSelectedLeague] =
    useState<LeagueType>("j1");

  const [standings, setStandings] = useState<
    Record<LeagueType, JLeagueStanding[]>
  >({
    j1: [],
    j2: [],
    j3: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStandings() {
      try {
        const results = await Promise.all(
          leagues.map(async ({ key }) => {
            const response = await fetch(
              `/api/j-league-standings?league=${key}`
            );

            if (!response.ok) {
              throw new Error(`${key}順位表取得失敗`);
            }

            const data =
              (await response.json()) as JLeagueStanding[];

            return [key, data] as const;
          })
        );

        setStandings(
          Object.fromEntries(results) as Record<
            LeagueType,
            JLeagueStanding[]
          >
        );
      } catch (error) {
        console.error(
          "Jリーグ順位表取得エラー:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    fetchStandings();
  }, []);

  const currentStandings =
    standings[selectedLeague].slice(0, 5);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
      <div className="border-b-4 border-red-600 bg-slate-950 px-6 py-6 text-white sm:px-8">
        <p className="text-xs font-black tracking-[0.2em] text-red-400">
          J.LEAGUE STANDINGS
        </p>

        <div className="mt-1 flex items-center gap-3">
          <div className="h-8 w-1.5 rounded-full bg-red-600" />

          <h2 className="text-2xl font-black sm:text-3xl">
            ⚽ Jリーグ順位表
          </h2>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          Jリーグ公式の順位情報をもとに、各リーグの上位5チームを表示しています。
        </p>
      </div>

      <div className="p-6 sm:p-8">
        <div className="mb-6 flex gap-2">
          {leagues.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedLeague(key)}
              className={`rounded-full px-5 py-2.5 text-sm font-black transition ${
                selectedLeague === key
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">
            順位表を読み込んでいます…
          </p>
        ) : currentStandings.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            順位表を取得できませんでした。
          </p>
        ) : (
          <div className="space-y-3">
            {currentStandings.map((item, index) => (
              <div
                key={`${selectedLeague}-${item.club}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${
                    rankColors[index] ?? "bg-blue-600"
                  }`}
                >
                  {item.rank}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-black text-slate-900">
                    {item.club}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.played}試合 / {item.wins}勝 {item.draws}分{" "}
                    {item.losses}敗 / 得失 {item.goalDiff}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-slate-400">
                    勝点
                  </p>

                  <p className="text-xl font-black text-red-600">
                    {item.points}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-slate-100 pt-5 text-right">
          <a
            href={officialUrls[selectedLeague]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-red-600 hover:text-red-800"
          >
            Jリーグ公式の全順位を見る →
          </a>
        </div>
      </div>
    </section>
  );
}
