"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const syncNews = async () => {
  setLoading(true);
  setMessage("");

  try {
    const res = await fetch("/api/news/sync");

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error ?? "ニュース取得に失敗しました");
    }

    setMessage(
      `取得完了：新規 ${data.added}件 / 更新 ${data.updated}件 / 合計 ${data.total}件`
    );
  } catch (error) {
    console.error(error);

    const message =
      error instanceof Error
        ? error.message
        : "不明なエラーが発生しました";

    setMessage(`取得失敗：${message}`);
  } finally {
    setLoading(false);
  }
};


  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10">
          <p className="font-bold text-blue-600">AI NEWS ジャパン</p>

          <h1 className="mt-2 text-4xl font-black text-slate-900">
            管理画面
          </h1>

          <p className="mt-3 text-slate-500">
            ニュース取得・今日のまとめを管理します。
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">
            <div className="text-4xl">🔄</div>

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              最新ニュースを取得
            </h2>

            <p className="mt-3 leading-7 text-slate-500">
              RSSから最新ニュースを取得し、AI分析してデータベースへ保存します。
            </p>

            <button
              onClick={syncNews}
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-blue-600 px-6 py-4 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "取得中..." : "ニュースを取得する"}
            </button>

            {message && (
              <p className="mt-4 rounded-xl bg-slate-100 p-4 text-sm font-bold text-slate-700">
                {message}
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">
            <div className="text-4xl">📰</div>

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              今日のニュースまとめ
            </h2>

            <p className="mt-3 leading-7 text-slate-500">
              AIが今日の主要ニュースを厳選してまとめます。
            </p>

            <Link
              href="/daily-summary"
              className="mt-6 block w-full rounded-2xl bg-slate-900 px-6 py-4 text-center font-black text-white transition hover:bg-blue-600"
            >
              今日のまとめを見る
            </Link>
          </section>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">
          <div className="text-4xl">🏠</div>

          <h2 className="mt-5 text-2xl font-black text-slate-900">
            サイトを確認
          </h2>

          <Link
            href="/"
            className="mt-6 block rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-center font-black text-slate-900 transition hover:bg-blue-50"
          >
            トップページへ →
          </Link>
        </div>
      </div>
    </main>
  );
}
