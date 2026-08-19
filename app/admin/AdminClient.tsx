"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SummaryData = {
  summary: string;
};

type AffiliateProgram = {
  id: number;
  name: string;
  programId: string | null;
  url: string;
  category: string | null;
  keywords: string | null;
  description: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
};

export default function AdminClient() {
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState("");

  // アフィリエイト案件
  const [affiliateName, setAffiliateName] = useState("");
  const [affiliateProgramId, setAffiliateProgramId] =
    useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [affiliateCategory, setAffiliateCategory] = useState<string[]>([]);
    useState("");
  const [affiliateKeywords, setAffiliateKeywords] =
    useState("");
  const [affiliatePriority, setAffiliatePriority] =
    useState(0);

  const [affiliateLoading, setAffiliateLoading] =
    useState(false);

  // 登録済み案件
  const [affiliatePrograms, setAffiliatePrograms] =
    useState<AffiliateProgram[]>([]);

  const [affiliateListLoading, setAffiliateListLoading] =
    useState(false);

  const [affiliateDeleteLoading, setAffiliateDeleteLoading] =
    useState<number | null>(null);

  // 編集
  const [editingAffiliateId, setEditingAffiliateId] =
    useState<number | null>(null);

  const [affiliateEditLoading, setAffiliateEditLoading] =
    useState(false);

  // =========================
  // ニュース取得
  // =========================

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

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(`取得失敗：${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // 今日のニュースまとめ
  // =========================

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

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(`まとめ作成失敗：${errorMessage}`);
    } finally {
      setSummaryLoading(false);
    }
  };

  // =========================
  // 登録済み案件取得
  // =========================

  const loadAffiliatePrograms = async () => {
    setAffiliateListLoading(true);

    try {
      const res = await fetch("/api/affiliate");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ??
            "案件一覧の取得に失敗しました"
        );
      }

      setAffiliatePrograms(data.programs ?? []);
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "案件一覧の取得に失敗しました";

      setMessage(
        `案件一覧取得失敗：${errorMessage}`
      );
    } finally {
      setAffiliateListLoading(false);
    }
  };

  useEffect(() => {
    loadAffiliatePrograms();
  }, []);

  // =========================
  // 入力欄リセット
  // =========================

  const resetAffiliateForm = () => {
    setAffiliateName("");
    setAffiliateProgramId("");
    setAffiliateUrl("");
    setAffiliateCategory([]);
    setAffiliateKeywords("");
    setAffiliatePriority(0);
    setEditingAffiliateId(null);
  };

  // =========================
  // アフィリエイト案件登録
  // =========================

  const registerAffiliate = async () => {
    if (!affiliateName || !affiliateUrl) {
      setMessage(
        "案件名と広告リンクを入力してください"
      );
      return;
    }

    setAffiliateLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/affiliate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: affiliateName,
          programId: affiliateProgramId,
          url: affiliateUrl,
          category: affiliateCategory.join(","),
          keywords: affiliateKeywords,
          priority: affiliatePriority,
          isActive: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ??
            "案件の登録に失敗しました"
        );
      }

      setMessage(
        `「${data.program.name}」を登録しました`
      );

      resetAffiliateForm();

      await loadAffiliatePrograms();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(
        `案件登録失敗：${errorMessage}`
      );
    } finally {
      setAffiliateLoading(false);
    }
  };

  // =========================
  // アフィリエイト案件編集開始
  // =========================

  const startEditAffiliate = (
    program: AffiliateProgram
  ) => {
    setEditingAffiliateId(program.id);

    setAffiliateName(program.name);
    setAffiliateProgramId(
      program.programId ?? ""
    );
    setAffiliateUrl(program.url);
    setAffiliateCategory(
      program.category ? program.category.split(",").map((item) => item.trim()).filter(Boolean) : []
    );
    setAffiliateKeywords(
      program.keywords ?? ""
    );
    setAffiliatePriority(program.priority);

    setMessage(
      `「${program.name}」を編集しています`
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================
  // アフィリエイト案件更新
  // =========================

  const updateAffiliate = async () => {
    if (
      editingAffiliateId === null ||
      !affiliateName ||
      !affiliateUrl
    ) {
      setMessage(
        "案件名と広告リンクを入力してください"
      );
      return;
    }

    setAffiliateEditLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/affiliate", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingAffiliateId,
          name: affiliateName,
          programId: affiliateProgramId,
          url: affiliateUrl,
          category: affiliateCategory.join(","),
          keywords: affiliateKeywords,
          priority: affiliatePriority,
          isActive: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ??
            "案件の更新に失敗しました"
        );
      }

      setMessage(
        `「${data.program.name}」を更新しました`
      );

      resetAffiliateForm();

      await loadAffiliatePrograms();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(
        `案件更新失敗：${errorMessage}`
      );
    } finally {
      setAffiliateEditLoading(false);
    }
  };

  // =========================
  // 編集キャンセル
  // =========================

  const cancelEditAffiliate = () => {
    resetAffiliateForm();
    setMessage("編集をキャンセルしました");
  };

  // =========================
  // アフィリエイト案件削除
  // =========================

  const deleteAffiliate = async (
    id: number,
    name: string
  ) => {
    const confirmed = window.confirm(
      `「${name}」を削除しますか？`
    );

    if (!confirmed) {
      return;
    }

    setAffiliateDeleteLoading(id);
    setMessage("");

    try {
      const res = await fetch(
        `/api/affiliate?id=${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ??
            "案件の削除に失敗しました"
        );
      }

      setMessage(
        `「${name}」を削除しました`
      );

      await loadAffiliatePrograms();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(
        `案件削除失敗：${errorMessage}`
      );
    } finally {
      setAffiliateDeleteLoading(null);
    }
  };

  // =========================
  // X投稿
  // =========================

  const postToX = async () => {
    if (!summary) {
      setMessage(
        "先に今日のニュースまとめを作成してください"
      );
      return;
    }

    try {
      setMessage(
        "やんすAIがX投稿を作成中..."
      );

      const res = await fetch(
        "/api/post-daily-x",
        {
          method: "POST",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ??
            "X投稿の作成に失敗しました"
        );
      }

      window.open(
        data.intentUrl,
        "_blank"
      );

      setMessage(
        `X投稿を作成しました！ AI評価：${data.score}点`
      );
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(
        `X投稿作成失敗：${errorMessage}`
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">

        {/* ヘッダー */}
        <div className="mb-10">
          <p className="font-bold text-blue-600">
            AI NEWS ジャパン
          </p>

          <h1 className="mt-2 text-4xl font-black text-slate-900">
            管理画面
          </h1>

          <p className="mt-3 text-slate-500">
            ニュース取得・まとめ作成・X投稿・アフィリエイト案件を管理します。
          </p>
        </div>

        {/* ニュース・まとめ */}
        <div className="grid gap-6 md:grid-cols-2">

          {/* ニュース取得 */}
          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">
            <div className="text-4xl">
              🔄
            </div>

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

          {/* 今日のニュースまとめ */}
          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">
            <div className="text-4xl">
              📰
            </div>

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

        {/* メッセージ */}
        {message && (
          <div className="mt-6 rounded-2xl bg-white p-5 text-center font-bold text-slate-700 shadow">
            {message}
          </div>
        )}

        {/* ニュースまとめ */}
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

        {/* アフィリエイト案件管理 */}
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">

          <div className="text-4xl">
            💰
          </div>

          <h2 className="mt-5 text-2xl font-black text-slate-900">
            アフィリエイト案件管理
          </h2>

          <Link
            href="/admin/affiliate-image"
            className="mt-5 inline-flex items-center rounded-2xl bg-slate-900 px-5 py-3 font-black text-white transition hover:bg-blue-600"
          >
            🖼️ A8バナー管理
          </Link>

          <p className="mt-2 leading-7 text-slate-500">
            A8.netなどの広告案件を登録します。
            登録した案件は、ニュース内容に合わせて自動表示します。
          </p>

          {/* 編集中表示 */}
          {editingAffiliateId !== null && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-black text-amber-800">
                ✏️ 案件を編集中です
              </p>

              <p className="mt-1 text-sm text-amber-700">
                下の入力欄を変更して「案件を更新する」を押してください。
              </p>
            </div>
          )}

          {/* 登録フォーム */}
          <div className="mt-6 space-y-5">

            {/* 案件名 */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                案件名 *
              </label>

              <input
                type="text"
                value={affiliateName}
                onChange={(e) =>
                  setAffiliateName(
                    e.target.value
                  )
                }
                placeholder="例：Notta"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* A8案件ID */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                A8案件ID
              </label>

              <input
                type="text"
                value={affiliateProgramId}
                onChange={(e) =>
                  setAffiliateProgramId(
                    e.target.value
                  )
                }
                placeholder="例：s00000024524001"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* 広告リンク */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                A8広告リンク *
              </label>

              <input
                type="url"
                value={affiliateUrl}
                onChange={(e) =>
                  setAffiliateUrl(
                    e.target.value
                  )
                }
                placeholder="A8で発行した広告リンクを貼り付け"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* カテゴリー */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                ニュースカテゴリー
              </label>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  "国内",
                  "国際",
                  "経済",
                  "テクノロジー",
                  "スポーツ",
                  "芸能",
                  "エンタメ",
                  "その他",
                ].map((category) => {
                  const checked = affiliateCategory.includes(category);

                  return (
                    <label
                      key={category}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                        checked
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setAffiliateCategory((current) =>
                            current.includes(category)
                              ? current.filter((item) => item !== category)
                              : [...current, category]
                          );
                        }}
                        className="h-4 w-4"
                      />
                      {category}
                    </label>
                  );
                })}
              </div>

              <p className="mt-2 text-xs text-slate-400">
                関連するカテゴリーを複数選択できます。
              </p>
            </div>

            {/* キーワード */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                関連キーワード
              </label>

              <input
                type="text"
                value={affiliateKeywords}
                onChange={(e) =>
                  setAffiliateKeywords(
                    e.target.value
                  )
                }
                placeholder="例：AI,ChatGPT,議事録,文字起こし"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                カンマ「,」で区切って入力してください。
              </p>
            </div>

            {/* 優先度 */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                優先度
              </label>

              <input
                type="number"
                min="0"
                max="100"
                value={affiliatePriority}
                onChange={(e) =>
                  setAffiliatePriority(
                    Number(e.target.value)
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                数字が大きいほど優先して使用します。
              </p>
            </div>

            {/* ボタン */}
            <div className="grid gap-3 sm:grid-cols-2">

              <button
                onClick={
                  editingAffiliateId !== null
                    ? updateAffiliate
                    : registerAffiliate
                }
                disabled={
                  affiliateLoading ||
                  affiliateEditLoading
                }
                className="w-full rounded-2xl bg-emerald-600 px-6 py-4 font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editingAffiliateId !== null
                  ? affiliateEditLoading
                    ? "更新中..."
                    : "✏️ 案件を更新する"
                  : affiliateLoading
                    ? "登録中..."
                    : "💰 アフィリエイト案件を登録する"}
              </button>

              {editingAffiliateId !== null && (
                <button
                  onClick={cancelEditAffiliate}
                  disabled={
                    affiliateEditLoading
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-6 py-4 font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  キャンセル
                </button>
              )}

            </div>

          </div>

          {/* 登録済み案件 */}
          <div className="mt-10 border-t border-slate-200 pt-8">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h3 className="text-2xl font-black text-slate-900">
                  📋 登録済み案件
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  現在登録されているアフィリエイト案件です。
                </p>
              </div>

              <button
                onClick={
                  loadAffiliatePrograms
                }
                disabled={
                  affiliateListLoading
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {affiliateListLoading
                  ? "更新中..."
                  : "🔄 一覧を更新"}
              </button>

            </div>

            {/* 案件なし */}
            {!affiliateListLoading &&
              affiliatePrograms.length ===
                0 && (
                <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                  登録されている案件はありません。
                </div>
              )}

            {/* 案件一覧 */}
            <div className="mt-5 space-y-4">

              {affiliatePrograms.map(
                (program) => (
                  <div
                    key={program.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <h4 className="text-lg font-black text-slate-900">
                            {program.name}
                          </h4>

                          {program.category && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                              {program.category}
                            </span>
                          )}

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              program.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {program.isActive
                              ? "有効"
                              : "無効"}
                          </span>

                        </div>

                        {program.programId && (
                          <p className="mt-2 text-sm text-slate-500">
                            A8案件ID：
                            <span className="font-mono">
                              {program.programId}
                            </span>
                          </p>
                        )}

                        {program.keywords && (
                          <p className="mt-2 text-sm text-slate-600">
                            キーワード：
                            {program.keywords}
                          </p>
                        )}

                        <p className="mt-2 text-sm font-bold text-slate-600">
                          優先度：
                          {program.priority}
                        </p>

                      </div>

                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">

                        <button
                          onClick={() =>
                            startEditAffiliate(
                              program
                            )
                          }
                          className="rounded-xl bg-amber-50 px-5 py-3 text-center text-sm font-black text-amber-700 hover:bg-amber-100"
                        >
                          ✏️ 編集
                        </button>

                        <a
                          href={program.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-black text-white hover:bg-blue-700"
                        >
                          🔗 広告を見る
                        </a>

                        <button
                          onClick={() =>
                            deleteAffiliate(
                              program.id,
                              program.name
                            )
                          }
                          disabled={
                            affiliateDeleteLoading ===
                            program.id
                          }
                          className="rounded-xl bg-red-50 px-5 py-3 text-sm font-black text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          {affiliateDeleteLoading ===
                          program.id
                            ? "削除中..."
                            : "🗑️ 削除"}
                        </button>

                      </div>

                    </div>

                  </div>
                )
              )}

            </div>

          </div>

        </section>

        {/* シェア分析 */}
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

        {/* トップページ */}
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