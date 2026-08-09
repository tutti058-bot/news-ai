"use client";

import { useEffect, useState } from "react";

type NewsItem = {
  id: number;
  title: string;
  category: string | null;
  score: number;
  url: string;
};

type SummaryData = {
  date: string;
  count: number;
  summary: string;
  news: NewsItem[];
  cached?: boolean;
};

const SITE_URL = "https://tutti-news-ai-bay.vercel.app";

export default function DailySummaryPage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/daily-summary")
      .then((res) => {
        if (!res.ok) {
          throw new Error("ニュースまとめの取得に失敗しました");
        }

        return res.json();
      })
      .then((result) => {
        setData(result);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

const postToX = () => {
  if (!data?.summary) return;

  const summaryUrl = `${SITE_URL}/daily-summary`;

  const text = `${data.summary}

🔗 今日のニュースまとめはこちら
${summaryUrl}`;

  const url =
    "https://twitter.com/intent/tweet?text=" +
    encodeURIComponent(text);

  window.open(url, "_blank");
};


  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-lg font-bold text-slate-600">
          今日のニュースをまとめています…
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="font-bold text-red-600">{error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-sm font-bold text-blue-600">
          AI NEWS ジャパン
        </p>

        <h1 className="mt-2 text-4xl font-black text-slate-900">
          📰 今日1日のニュースまとめ
        </h1>

        <p className="mt-3 text-slate-500">
          {data?.date} / {data?.count}件のニュースからAIが厳選
        </p>
      </div>

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-10">
        <div className="whitespace-pre-wrap text-base leading-8 text-slate-800 sm:text-lg">
          {data?.summary}
        </div>
      </article>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <h2 className="mb-5 text-2xl font-black text-slate-900">
          🔗 関連ニュース
        </h2>

        <div className="space-y-4">
          {data?.news.slice(0, 5).map((item) => (
            <a
              key={item.id}
              href={item.url}
              className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                  {item.category ?? "国内"}
                </span>

                <span className="text-xs font-bold text-slate-400">
                  AI重要度 {item.score}点
                </span>
              </div>

              <h3 className="font-bold leading-6 text-slate-900">
                {item.title}
              </h3>

              <p className="mt-2 text-sm font-semibold text-blue-600">
                記事を読む →
              </p>
            </a>
          ))}
        </div>
      </section>

      <div className="mt-8 flex justify-center">
        <button
          onClick={postToX}
          className="rounded-full bg-black px-8 py-4 text-lg font-black text-white shadow-lg transition hover:scale-105"
        >
          𝕏 Xに投稿する
        </button>
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        Xの投稿画面で内容を確認してから投稿できます。
      </p>
    </main>
  );
}
