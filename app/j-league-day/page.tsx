"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RakutenWidget from "@/components/RakutenWidget";
import { getNextJLeagueDay } from "@/lib/jLeagueDays";
import SoccerRankingSidebar from "@/components/SoccerRankingSidebar";
import SoccerAffiliateSidebar from "@/components/SoccerAffiliateSidebar";
import JLeagueStandings from "@/components/JLeagueStandings";

type NewsItem = {
  id: number;
  title: string;
  summary: string | null;
  image: string | null;
  category: string | null;
  score: number | null;
  publishedAt: string | null;
  soccerCategory?: string;
};

function getTodayString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  return `${year}年${month}月${day}日（${weekdays[date.getDay()]}）`;
}

export default function JLeagueDayPage() {
  const [now, setNow] = useState(new Date());
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [soccerViewWeekly, setSoccerViewWeekly] =
    useState<any[]>([]);

  const [soccerViewMonthly, setSoccerViewMonthly] =
    useState<any[]>([]);

  const [selectedCategory, setSelectedCategory] =
    useState("すべて");

  const soccerCategories = [
    "すべて",
    "Jリーグ",
    "海外サッカー",
    "日本代表",
    "海外日本人",
    "その他",
  ];

  const NEWS_PER_PAGE = 10;

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchNews() {
      try {
        const response = await fetch("/api/j-league-news");

        if (!response.ok) {
          throw new Error("ニュース取得失敗");
        }

        const data = await response.json();

        setNews(data.news ?? []);

        setSoccerViewWeekly(
          data.rankings?.views?.weekly ?? []
        );

        setSoccerViewMonthly(
          data.rankings?.views?.monthly ?? []
        );
      } catch (error) {
        console.error("Jリーグニュース取得エラー:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchNews();
  }, []);

  const today = getTodayString();
  const nextDay = getNextJLeagueDay(today);

  if (!nextDay) {
    return (
      <main className="jleague-page">
        <section className="jleague-hero">
          <div className="jleague-badge">
            ⚽ J.LEAGUE DAY
          </div>

          <h1>次回のJリーグDAYは準備中です</h1>
        </section>
      </main>
    );
  }

  const [year, month, day] = nextDay.date.split("-").map(Number);
  const eventDate = new Date(year, month - 1, day);

  const isToday =
    now.getFullYear() === eventDate.getFullYear() &&
    now.getMonth() === eventDate.getMonth() &&
    now.getDate() === eventDate.getDate();

  const diff = eventDate.getTime() - now.getTime();

  const days = Math.max(
    0,
    Math.ceil(diff / (1000 * 60 * 60 * 24))
  );

  const hours = Math.max(
    0,
    Math.floor((diff / (1000 * 60 * 60)) % 24)
  );

  const minutes = Math.max(
    0,
    Math.floor((diff / (1000 * 60)) % 60)
  );

  const seconds = Math.max(
    0,
    Math.floor((diff / 1000) % 60)
  );

  const filteredNews =
    selectedCategory === "すべて"
      ? news
      : news.filter(
          (item) =>
            item.soccerCategory === selectedCategory
        );

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredNews.length / NEWS_PER_PAGE
    )
  );

  const safePage = Math.min(
    currentPage,
    totalPages
  );

  const startIndex =
    (safePage - 1) * NEWS_PER_PAGE;

  const currentNews = filteredNews.slice(
    startIndex,
    startIndex + NEWS_PER_PAGE
  );

  return (
    <main className="jleague-page">
      <section className="jleague-hero">
        <div className="jleague-badge">
          ⚽ J.LEAGUE DAY
        </div>

        {isToday ? (
          <>
            <h1>本日はJリーグDAY！</h1>

            <p className="lead">
              今日はJリーグ・サッカー関連のニュースを
              <br />
              いつもより多めにお届けします。
            </p>

            <p className="lead">
              J1 <strong>{nextDay.j1Matches}試合</strong> 開催
            </p>
          </>
        ) : (
          <>
            <p className="small-title">
              次回開催まで
            </p>

            <div className="countdown">
              <div>
                <strong>{days}</strong>
                <span>日</span>
              </div>

              <div>
                <strong>{hours}</strong>
                <span>時間</span>
              </div>

              <div>
                <strong>{minutes}</strong>
                <span>分</span>
              </div>

              <div>
                <strong>{seconds}</strong>
                <span>秒</span>
              </div>
            </div>

            <h1>
              JリーグDAYまであと{days}日
            </h1>

            <p className="lead">
              次回のJリーグDAYは
              <br />
              <strong>{formatDate(nextDay.date)}</strong>
            </p>
          </>
        )}
      </section>

      <section className="jleague-content">

        <h2>⚽ Jリーグ・サッカーニュース</h2>

        <p>
          AI NEWSジャパンでは、Jリーグの試合が多く開催される日を
          「JリーグDAY」として、サッカー関連ニュースをいつもより多めにお届けします。
        </p>

        <p className="mt-3">
          JリーグDAYでは、サッカー関連ニュースをカテゴリ別に整理し、
          AI評価もあわせて掲載しています。試合開催日に合わせて、
          Jリーグを中心とした注目ニュースをまとめてチェックできます。
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {soccerCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                setSelectedCategory(category);
                setCurrentPage(1);
              }}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                selectedCategory === category
                  ? "bg-green-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* 楽天スポーツランキング */}
        <RakutenWidget
          type="ranking"
          genreId="101070"
        />

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">

          <div>
        {loading ? (
          <p className="mt-8 text-center">
            ニュースを読み込み中...
          </p>
        ) : news.length === 0 ? (
          <div className="coming-card">
            <span>AI NEWS JAPAN</span>

            <h3>Jリーグニュース</h3>

            <p>
              現在表示できるJリーグ関連ニュースを準備中です。
            </p>
          </div>
        ) : (
          <>
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            {currentNews.map((item) => (
              <Link
                key={item.id}
                href={`/news/${item.id}`}
                className="group block h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg lg:rounded-3xl"
              >
                <article className="flex h-full flex-row lg:flex-col">

                  {/* 画像 */}
                  <div className="relative h-28 w-32 shrink-0 sm:h-32 sm:w-40 lg:h-auto lg:w-full">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105 lg:aspect-video"
                      />
                    ) : (
                      <div className="h-full w-full bg-slate-100 lg:aspect-video" />
                    )}

                    <span className="absolute left-2 top-2 rounded-full bg-green-600 px-2 py-0.5 text-[9px] font-bold text-white lg:left-3 lg:top-3 lg:px-3 lg:py-1 lg:text-xs">
                      ⚽ サッカー
                    </span>
                  </div>

                  {/* 内容 */}
                  <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4 lg:p-6">
                    <h3 className="line-clamp-3 text-sm font-black leading-5 text-slate-900 transition group-hover:text-green-600 sm:text-base sm:leading-6 lg:line-clamp-2 lg:text-xl lg:leading-snug">
                      {item.title}
                    </h3>

                    {/* PCのみ概要 */}
                    {item.summary && (
                      <p className="mt-3 hidden line-clamp-2 text-sm leading-6 text-slate-600 lg:block">
                        {item.summary}
                      </p>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-2 pt-3 lg:border-t lg:border-slate-100 lg:pt-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[10px] text-slate-500 sm:text-xs lg:text-sm">
                          📅 {item.publishedAt
                            ? new Date(item.publishedAt).toLocaleDateString("ja-JP")
                            : ""}
                        </span>

                        <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-500 sm:text-xs lg:px-3 lg:text-sm">
                          AI {item.score ?? 0}点
                        </span>
                      </div>

                      <span className="shrink-0 rounded-full bg-green-600 px-2.5 py-1.5 text-[9px] font-bold text-white transition duration-300 group-hover:bg-slate-900 sm:text-[10px] lg:px-4 lg:py-2 lg:text-sm">
                        記事を読む →
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => {
                  setCurrentPage((page) =>
                    Math.max(1, page - 1)
                  );
                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
                disabled={safePage === 1}
                className="rounded-lg border px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← 前へ
              </button>

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              ).map((page) => (
                <button
                  key={page}
                  onClick={() => {
                    setCurrentPage(page);
                    window.scrollTo({
                      top: 0,
                      behavior: "smooth",
                    });
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                    safePage === page
                      ? "bg-green-600 text-white"
                      : "border bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => {
                  setCurrentPage((page) =>
                    Math.min(totalPages, page + 1)
                  );
                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
                disabled={safePage === totalPages}
                className="rounded-lg border px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
              >
                次へ →
              </button>
            </div>
          )}
          </>
        )}

          </div>

          <div className="space-y-8">
            <SoccerRankingSidebar
              viewsWeekly={soccerViewWeekly}
              viewsMonthly={soccerViewMonthly}
            />

            <JLeagueStandings />

            <SoccerAffiliateSidebar />
          </div>

        </div>
      </section>
    </main>
  );
}
