"use client";

import { useState } from "react";
import Link from "next/link";

type SummaryData = {
  summary: string;
};

const SITE_URL = "https://tutti-news-ai-bay.vercel.app";

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState("");

  const syncNews = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/news/sync");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ?? "ニュース取得に失敗しました"
        );
      }

      setMessage(
        `取得完了：新規 ${data.added}件 / スキップ ${data.skipped}件 / 合計 ${data.total}件`
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

  const createSummary = async () => {
    setSummaryLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/daily-summary");
      const data: SummaryData = await res.json();

      if (!res.ok) {
        throw new Error(
          "ニュースまとめの作成に失敗しました"
        );
      }

      setSummary(data.summary);
      setMessage("今日のニュースまとめを作成しました");
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(`まとめ作成失敗：${message}`);
    } finally {
      setSummaryLoading(false);
    }
  };

  const postToX = async () => {
    if (!summary) {
      setMessage(
        "先に今日のニュースまとめを作成してください"
      );
      return;
    }

    try {
      setMessage("やんすAIがX投稿を作成中...");

      const res = await fetch("/api/post-daily-x", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ?? "X投稿の作成に失敗しました"
        );
      }

      window.open(data.intentUrl, "_blank");

      setMessage(
        `X投稿を作成しました！ AI評価：${data.score}点`
      );
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(`X投稿作成失敗：${message}`);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <p className="font-bold text-blue-600">
            AI NEWS ジャパン
          </p>

          <h1 className="mt-2 text-4xl font-black text-slate-900">
            管理画面
          </h1>

          <p className="mt-3 text-slate-500">
            ニュース取得・まとめ作成・X投稿を管理します。
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">
            <div className="text-4xl">🔄</div>

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              最新ニュースを取得
            </h2>

            <p className="mt-3 leading-7 text-slate-500">
              RSSから最新ニュースを取得し、新規ニュースだけをAI分析して保存します。
            </p>

            <button
              onClick={syncNews}
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-blue-600 px-6 py-4 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "取得中..."
                : "ニュースを取得する"}
            </button>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">
            <div className="text-4xl">📰</div>

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              今日のニュースまとめ
            </h2>

            <p className="mt-3 leading-7 text-slate-500">
              今日のニュースをAIがまとめます。
            </p>

            <button
              onClick={createSummary}
              disabled={summaryLoading}
              className="mt-6 w-full rounded-2xl bg-slate-900 px-6 py-4 font-black text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {summaryLoading
                ? "まとめを作成中..."
                : "📰 今日のニュースまとめを作成"}
            </button>
          </section>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl bg-white p-5 text-center font-bold text-slate-700 shadow">
            {message}
          </div>
        )}

        {summary && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">
            <h2 className="text-2xl font-black text-slate-900">
              📰 今日のニュースまとめ
            </h2>

            <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 leading-8 text-slate-800">
              {summary}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <button
                onClick={postToX}
                className="rounded-2xl bg-black px-6 py-4 font-black text-white transition hover:scale-[1.02]"
              >
                𝕏 Xに投稿する
              </button>

              <Link
                href="/daily-summary"
                className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center font-black text-slate-900 transition hover:bg-slate-50"
              >
                詳細ページを見る →
              </Link>
            </div>
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">
          <h2 className="text-2xl font-black text-slate-900">
            📊 シェア分析
          </h2>

          <p className="mt-2 text-slate-500">
            X・LINEのシェア状況を確認できます。
          </p>

          <Link
            href="/share-stats"
            className="mt-6 block rounded-2xl bg-blue-600 px-6 py-4 text-center font-black text-white transition hover:bg-blue-700"
          >
            📊 シェア分析を見る →
          </Link>
        </section>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">
          <Link
            href="/"
            className="block rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-center font-black text-slate-900 transition hover:bg-blue-50"
          >
            🏠 トップページへ →
          </Link>
        </div>
      </div>
    </main>
  );
}