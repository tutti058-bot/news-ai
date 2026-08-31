"use client";

import { FormEvent, useState } from "react";

export default function ContentRequestBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!message.trim()) {
      setResult("リクエスト内容を入力してください。");
      return;
    }

    setSending(true);
    setResult("");

    try {
      const response = await fetch(
        "/api/content-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            message,
            website,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setResult(
          data.error ??
            "送信できませんでした。"
        );
        return;
      }

      setName("");
      setMessage("");
      setResult(
        "リクエストを受け付けました。ありがとうございます！"
      );
    } catch {
      setResult(
        "送信に失敗しました。時間を置いてもう一度お試しください。"
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

      {!isOpen ? (
        <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>

              <h2 className="text-lg font-black text-slate-900">
                みんなのリクエストBOX
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              見たいニュースや特集してほしいテーマを教えてください。
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="shrink-0 whitespace-nowrap rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700"
          >
            リクエストを送る →
          </button>

        </div>
      ) : (
        <div className="p-5 sm:p-6">

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                YOUR REQUEST
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-900">
                💬 みんなのリクエストBOX
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-sm font-bold text-slate-400 transition hover:text-slate-700"
            >
              閉じる ×
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            「この記事をもっと見たい」
            「このチームを特集してほしい」
            「こんな記事を増やしてほしい」など、
            AI NEWS ジャパンへのリクエストを送ってください。
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                お名前 <span className="font-normal text-slate-400">（任意）</span>
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={50}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="お名前"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                リクエスト内容
              </label>

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={500}
                required
                rows={4}
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="見たい記事・特集してほしいテーマなどを書いてください"
              />

              <p className="mt-2 text-right text-xs text-slate-400">
                {message.length}/500
              </p>
            </div>

            <div
              aria-hidden="true"
              className="absolute left-[-9999px] h-0 overflow-hidden"
            >
              <label>
                Website
                <input
                  type="text"
                  name="website"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "送信中..." : "リクエストを送る →"}
            </button>

            {result && (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                {result}
              </p>
            )}

          </form>
        </div>
      )}

    </section>
  );
}
