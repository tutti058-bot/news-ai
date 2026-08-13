import { prisma } from "@/lib/prisma";
import { generateYansuComment } from "@/lib/ai";
import Link from "next/link";
import type { Metadata } from "next";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { id } = await params;

  const news = await prisma.news.findUnique({
    where: {
      id: Number(id),
    },
  });

  if (!news) {
    return {
      title: "AI News ジャパン",
    };
  }

  return {
    title: news.title,
    description: news.summary ?? "",

    openGraph: {
      title: news.title,
      description: news.summary ?? "",
      images: [
        {
          url:
            news.image ??
            "https://tutti-news-ai-bay.vercel.app/news.jpg",
          width: 1200,
          height: 630,
          alt: news.title,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: news.title,
      description: news.summary ?? "",
      images: [
        {
          url:
            news.image ??
            "https://tutti-news-ai-bay.vercel.app/news.jpg",
          width: 1200,
          height: 630,
          alt: news.title,
        },
      ],
    },
  };
}

export default async function NewsDetail({
  params,
}: Props) {
  const { id } = await params;

  const news = await prisma.news.findUnique({
    where: {
      id: Number(id),
    },
  });

  if (!news) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <p>記事が見つかりません</p>
      </div>
    );
  }

  // 閲覧数を1回増やして、24時間ランキング用の履歴を保存
  await prisma.news.update({
    where: {
      id: news.id,
    },
    data: {
      views: {
        increment: 1,
      },
    },
  });

  await prisma.newsView.create({
    data: {
      newsId: news.id,
    },
  });

  const related = await prisma.news.findMany({
    where: {
      id: {
        not: news.id,
      },
      category: news.category ?? undefined,
    },
    orderBy: {
      publishedAt: "desc",
    },
    take: 3,
  });

  const url = `https://tutti-news-ai-bay.vercel.app/news/${news.id}`;

  const yansuComment = await generateYansuComment(
    news.title,
    news.summary ?? "",
    news.score ?? 60,
    news.category ?? "国内"
  );

  const tweetText = `やんすAI
「${yansuComment}」

AI評価：${news.score ?? 60}点／100点

👇 詳細はこちら
${url}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">

      <Link
        href="/"
        className="text-sm font-semibold text-blue-600 hover:underline"
      >
        ← トップへ戻る
      </Link>

      {/* 基本情報 */}
      <div className="mt-6 flex flex-wrap gap-3">

        <span className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white">
          {news.category}
        </span>

        <span className="rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900">
          AI {news.score}点
        </span>

        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
          📅{" "}
          {news.publishedAt
            ? new Date(news.publishedAt).toLocaleDateString("ja-JP")
            : ""}
        </span>

        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
          👁 {news.views ?? 0} views
        </span>

      </div>

      {/* AI評価詳細 */}
      <div className="mt-6 w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <h2 className="text-xl font-black text-slate-900">
            AI評価
          </h2>

          <span className="rounded-full bg-amber-400 px-4 py-2 text-lg font-black text-slate-900">
            {news.score ?? 0}点 / 100点
          </span>

        </div>

        <div className="mt-6 space-y-5">

          {/* ニュース重要度 */}
          <div>
            <div className="mb-2 flex justify-between text-sm font-bold">
              <span>📰 ニュース重要度</span>
              <span>
                {news.importanceScore ?? 0} / 30
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-red-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((news.importanceScore ?? 0) / 30) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* 話題性 */}
          <div>
            <div className="mb-2 flex justify-between text-sm font-bold">
              <span>🔥 話題性</span>
              <span>
                {news.buzzScore ?? 0} / 20
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-orange-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((news.buzzScore ?? 0) / 20) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* 影響範囲 */}
          <div>
            <div className="mb-2 flex justify-between text-sm font-bold">
              <span>🌏 影響範囲</span>
              <span>
                {news.impactScore ?? 0} / 20
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((news.impactScore ?? 0) / 20) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* 新規性 */}
          <div>
            <div className="mb-2 flex justify-between text-sm font-bold">
              <span>💡 新規性</span>
              <span>
                {news.noveltyScore ?? 0} / 15
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-purple-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((news.noveltyScore ?? 0) / 15) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* 今後の注目度 */}
          <div>
            <div className="mb-2 flex justify-between text-sm font-bold">
              <span>📈 今後の注目度</span>
              <span>
                {news.attentionScore ?? 0} / 15
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-green-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((news.attentionScore ?? 0) / 15) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

        </div>

      </div>

      {/* タイトル */}
      <h1 className="mt-6 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
        {news.title}
      </h1>

      {/* メイン画像 */}
      <img
        src={news.image ?? "/news.jpg"}
        alt={news.title}
        className="mt-8 h-64 w-full rounded-3xl object-cover sm:h-80 lg:h-[460px]"
      />

      {/* AI要約 */}
      <div className="mt-8 rounded-3xl bg-white p-6 shadow-lg sm:p-8">

        <h2 className="mb-4 text-xl font-black">
          AI要約
        </h2>

        <p className="whitespace-pre-wrap text-base leading-8 text-slate-700 sm:text-lg">
          {news.summary}
        </p>

        {news.sourceUrl && (
          <a
            href={news.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center rounded-full bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700"
          >
            元記事を読む →
          </a>
        )}

      </div>

      {/* やんすAIコメント */}
      <div className="mt-8 rounded-3xl bg-white p-6 shadow-lg">

        <h2 className="mb-4 text-xl font-black">
          やんすAIのコメント
        </h2>

        <div className="rounded-2xl bg-slate-50 p-5">

          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg font-black">
              やんすAI
            </span>
          </div>

          <p className="text-base font-semibold leading-7 text-slate-700">
            「{yansuComment}」
          </p>

        </div>

      </div>

      {/* シェア */}
      <div className="mt-8 rounded-3xl bg-white p-6 shadow-lg">

        <h2 className="mb-4 text-xl font-black">
          この記事をシェア
        </h2>

        <div className="flex flex-wrap gap-3">

          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              tweetText
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-black px-5 py-3 font-bold text-white"
          >
            Xでシェア
          </a>

          <a
            href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(
              url
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-green-500 px-5 py-3 font-bold text-white"
          >
            LINEで共有
          </a>

        </div>

      </div>

      {/* 関連記事 */}
      <section className="mt-14">

        <h2 className="mb-8 text-2xl font-black">
          関連記事
        </h2>

        <div className="grid gap-6 md:grid-cols-3">

          {related.map((item) => (
            <Link
              key={item.id}
              href={`/news/${item.id}`}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow transition hover:-translate-y-1 hover:shadow-xl"
            >

              <img
                src={item.image ?? "/news.jpg"}
                alt={item.title}
                className="aspect-video w-full object-cover transition duration-300 group-hover:scale-105"
              />

              <div className="p-5">

                <div className="mb-3 flex items-center gap-2">

                  <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                    {item.category}
                  </span>

                  <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-900">
                    AI {item.score}点
                  </span>

                </div>

                <h3 className="line-clamp-2 text-lg font-bold text-slate-900 transition group-hover:text-blue-600">
                  {item.title}
                </h3>

                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                  {item.summary}
                </p>

                <div className="mt-4 flex items-center justify-between text-sm text-slate-400">

                  <span>
                    {item.publishedAt
                      ? new Date(
                          item.publishedAt
                        ).toLocaleDateString("ja-JP")
                      : ""}
                  </span>

                  <span>
                    👁 {item.views ?? 0}
                  </span>

                </div>

              </div>

            </Link>
          ))}

        </div>

      </section>

    </main>
  );
}
