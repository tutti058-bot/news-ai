"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ShareStat = {
  id: number;
  title: string;
  publishedAt: string | null;
  xShares: number;
  lineShares: number;
  totalShares: number;
};

export default function ShareStatsPage() {
  const [stats, setStats] = useState<ShareStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadShareStats = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/share-stats", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ?? "シェア分析の取得に失敗しました"
        );
      }

      setStats(data.news ?? []);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "シェア分析の取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShareStats();
  }, []);

  const totalX = stats.reduce(
    (sum, item) => sum + item.xShares,
    0
  );

  const totalLine = stats.reduce(
    (sum, item) => sum + item.lineShares,
    0
  );

  const totalShares = stats.reduce(
    (sum, item) => sum + item.totalShares,
    0
  );

  const ranking = [...stats].sort(
    (a, b) => b.totalShares - a.totalShares
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/admin"
            className="font-bold text-blue-600 hover:underline"
          >
            ← 管理画面へ戻る
          </Link>

          <p className="mt-6 font-bold text-blue-600">
            AI NEWS ジャパン
          </p>

          <h1 className="mt-2 text-4xl font-black text-slate-900">
            📊 シェア分析
          </h1>

          <p className="mt-3 text-slate-500">
            X・LINEでシェアされた記事を分析します。
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl bg-white p-5 text-center font-bold text-red-600 shadow">
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <p className="text-sm font-bold text-slate-500">
              𝕏 Xシェア
            </p>

            <p className="mt-2 text-4xl font-black text-slate-900">
              {totalX}
            </p>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <p className="text-sm font-bold text-slate-500">
              LINEシェア
            </p>

            <p className="mt-2 text-4xl font-black text-slate-900">
              {totalLine}
            </p>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <p className="text-sm font-bold text-slate-500">
              総シェア
            </p>

            <p className="mt-2 text-4xl font-black text-blue-600">
              {totalShares}
            </p>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                🏆 シェアランキング
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                シェア数の多い記事から表示しています。
              </p>
            </div>

            <button
              onClick={loadShareStats}
              disabled={loading}
              className="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "更新中..." : "🔄 更新"}
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center font-bold text-slate-500">
              シェアデータを読み込んでいます...
            </div>
          ) : ranking.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
              シェアデータがありません。
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="px-4 py-4 text-center">
                      順位
                    </th>
                    <th className="px-4 py-4">
                      記事
                    </th>
                    <th className="px-4 py-4 text-center">
                      𝕏
                    </th>
                    <th className="px-4 py-4 text-center">
                      LINE
                    </th>
                    <th className="px-4 py-4 text-center">
                      合計
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {ranking.map((item, index) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100"
                    >
                      <td className="px-4 py-5 text-center text-xl font-black text-slate-400">
                        {index + 1}
                      </td>

                      <td className="max-w-xl px-4 py-5 font-bold text-slate-800">
                        {item.title}
                      </td>

                      <td className="px-4 py-5 text-center font-bold">
                        {item.xShares}
                      </td>

                      <td className="px-4 py-5 text-center font-bold">
                        {item.lineShares}
                      </td>

                      <td className="px-4 py-5 text-center text-xl font-black text-blue-600">
                        {item.totalShares}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mt-6">
          <Link
            href="/admin"
            className="block rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center font-black text-slate-900 shadow transition hover:bg-blue-50"
          >
            ← 管理画面へ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}