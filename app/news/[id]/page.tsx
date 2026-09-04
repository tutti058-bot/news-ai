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

  const canonicalUrl =
    `https://tutti-news-ai-bay.vercel.app/news/${news.id}`;

  return {
    title: news.title,
    description: news.summary ?? "",

    alternates: {
      canonical: canonicalUrl,
    },

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

  // 関連記事をタイトル・要約のキーワードで選定
  const baseText = `${news.title} ${news.summary ?? ""}`
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ");

  const baseWords = Array.from(
    new Set(
      baseText
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 2)
    )
  );

  const relatedCandidates = await prisma.news.findMany({
    where: {
      id: {
        not: news.id,
      },
      category: news.category ?? undefined,
    },
    orderBy: {
      publishedAt: "desc",
    },
    take: 30,
  });

  const related = relatedCandidates
    .map((item) => {
      const candidateText = `${item.title} ${item.summary ?? ""}`
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ");

      const score = baseWords.reduce((total, word) => {
        return candidateText.includes(word)
          ? total + 1
          : total;
      }, 0);

      return {
        ...item,
        relatedScore: score,
      };
    })
    .sort(
      (a, b) =>
        b.relatedScore - a.relatedScore ||
        (b.publishedAt?.getTime() ?? 0) -
          (a.publishedAt?.getTime() ?? 0)
    )
    .slice(0, 3);

  // おすすめアフィリエイト案件
  const affiliatePrograms =
    await prisma.affiliateProgram.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          priority: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

  // ニュースの記事タイトル・要約・カテゴリーを
  // 案件とのキーワード判定に使用
  const newsKeywords = [
    news.title,
    news.summary ?? "",
    news.category ?? "",
  ]
    .join(",")
    .toLowerCase();

  // ニュースと案件の相性をスコアリング
    // ニュースと案件の相性をスコアリング
  const scoredAffiliates = affiliatePrograms
    .map((program) => {
      let recommendationScore =
        program.priority;

      // カテゴリー一致
      if (
        news.category &&
        (program.category ?? "")
          .split(",")
          .map((item) => item.trim())
          .includes(news.category)
      ) {
        recommendationScore += 30;
      }

      // 案件側のキーワード
      const programKeywords = (
        program.keywords ?? ""
      )
        .split(",")
        .map((keyword) =>
          keyword.trim().toLowerCase()
        )
        .filter(Boolean);

      // キーワード一致
      for (const keyword of programKeywords) {
        if (
          keyword &&
          newsKeywords.includes(keyword)
        ) {
          recommendationScore += 10;
        }
      }

      return {
        ...program,
        recommendationScore,
      };
    })
    .sort(
      (a, b) =>
        b.recommendationScore -
        a.recommendationScore
    );

  // 同じ広告URLの重複を削除
  const uniqueAffiliates = Array.from(
    new Map(
      scoredAffiliates.map((program) => [
        program.url,
        program,
      ])
    ).values()
  );

  // 優先度・関連度が高い広告を2件
  const priorityAffiliates =
    uniqueAffiliates.slice(0, 2);

  // 残りの広告からランダムに1件
  const randomCandidates =
    uniqueAffiliates.slice(2);

  const randomAffiliate =
    randomCandidates.length > 0
      ? randomCandidates[
          Math.floor(
            Math.random() *
              randomCandidates.length
          )
        ]
      : null;

  // 最終表示：
  // 優先広告2件 + ランダム広告1件
    // 最終表示：
  // 優先広告2件 + ランダム広告1件
  const recommendedAffiliates = [
    ...priorityAffiliates,
    ...(randomAffiliate
      ? [randomAffiliate]
      : []),
  ];

  const url = `https://tutti-news-ai-bay.vercel.app/news/${news.id}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: news.title,
    description: news.summary ?? "",
    image: [
      news.image ??
        "https://tutti-news-ai-bay.vercel.app/news.jpg",
    ],
    datePublished: news.publishedAt
      ? news.publishedAt.toISOString()
      : undefined,
    dateModified: news.publishedAt
      ? news.publishedAt.toISOString()
      : undefined,
    author: {
      "@type": "Organization",
      name: "AI NEWS ジャパン",
    },
    publisher: {
      "@type": "Organization",
      name: "AI NEWS ジャパン",
      logo: {
        "@type": "ImageObject",
        url: "https://tutti-news-ai-bay.vercel.app/logo02.png",
        width: 512,
        height: 200,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  const hashtags: string[] = [];

  switch (news.category) {
    case "テクノロジー":
      hashtags.push("#AI", "#テクノロジー");
      break;

    case "スポーツ":
      hashtags.push("#スポーツ");
      break;

    case "芸能":
      hashtags.push("#芸能");
      break;

    case "経済":
      hashtags.push("#経済");
      break;

    default:
      hashtags.push("#ニュース");
  }

  if (news.title.includes("OpenAI")) {
    hashtags.push("#OpenAI");
  }

  if (news.title.includes("ChatGPT")) {
    hashtags.push("#ChatGPT");
  }

  if (news.title.includes("Google")) {
    hashtags.push("#Google");
  }

  if (news.title.includes("Apple")) {
    hashtags.push("#Apple");
  }

  if (news.title.includes("Microsoft")) {
    hashtags.push("#Microsoft");
  }

  if (news.title.includes("Cloudflare")) {
    hashtags.push("#Cloudflare");
  }

  if (news.title.includes("Tesla")) {
    hashtags.push("#Tesla");
  }

  if (news.title.includes("Meta")) {
    hashtags.push("#Meta");
  }

  let postScore = 3;

  if ((news.score ?? 0) >= 90) {
    postScore = 5;
  } else if ((news.score ?? 0) >= 80) {
    postScore = 4;
  } else if ((news.score ?? 0) >= 70) {
    postScore = 3;
  } else if ((news.score ?? 0) >= 60) {
    postScore = 2;
  } else {
    postScore = 1;
  }

  const stars =
    "★".repeat(postScore) +
    "☆".repeat(5 - postScore);

  let aiComment = "一般的なニュースです。";

  if (postScore === 5) {
    aiComment =
      "🔥 Xで話題になりやすいニュースです";
  } else if (postScore === 4) {
    aiComment =
      "📈 多くの人が興味を持ちそうです";
  } else if (postScore === 3) {
    aiComment =
      "👍 注目度は平均的です";
  } else if (postScore === 2) {
    aiComment =
      "ℹ️ 興味がある人向けのニュースです";
  } else {
    aiComment =
      "📌 ニッチな話題です";
  }

  // やんすAIコメント
  // 記事ページではOpenAIを呼ばず、カテゴリごとにコメントを変更
  let yansuComment =
    "このニュース、詳しく見ていくでやんす🤖";

  switch (news.category) {
    case "テクノロジー":
      yansuComment =
        "AIやテクノロジーの動き、これからも目が離せないでやんす🤖";
      break;

    case "スポーツ":
      yansuComment =
        "今後の展開にも注目したいニュースでやんす🤖";
      break;

    case "芸能":
      yansuComment =
        "これからの動きも気になるニュースでやんす🤖";
      break;

    case "経済":
      yansuComment =
        "これからの市場への影響も見ておきたいでやんす🤖";
      break;

    case "国際":
      yansuComment =
        "今後の動きにも注目しておきたいニュースでやんす🤖";
      break;

    case "国内":
      yansuComment =
        "身近なところにも関わってくるニュースかもしれないでやんす🤖";
      break;

    default:
      yansuComment =
        "このニュース、詳しく見ていくでやんす🤖";
  }

  // X投稿用
  const tweetText = `🚨 ${news.title}

👇 詳細はこちら
${url}

やんすAI
「${yansuComment}」`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">

      <Link
        href="/"
        className="text-sm font-semibold text-blue-600 hover:underline"
      >
        ← トップへ戻る
      </Link>

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
            ? new Date(
                news.publishedAt
              ).toLocaleDateString("ja-JP")
            : ""}
        </span>

        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
          👁 {news.views ?? 0} views
        </span>

      </div>

      <h1 className="mt-6 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
        {news.title}
      </h1>

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


      {/* AI NEWSジャパン独自の分析 */}
      <section className="mt-6 rounded-3xl border border-blue-100 bg-blue-50/60 p-6 shadow-sm sm:p-7">
        <p className="text-xs font-black tracking-[0.2em] text-blue-600">
          AI NEWS JAPAN ANALYSIS
        </p>

        <h2 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
          AI NEWSジャパン独自の分析
        </h2>

        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          元記事の内容をもとに、ニュースの重要度・話題性・影響範囲・新規性・今後の注目度をAIが分析しています。
        </p>
      </section>

      {/* AI評価詳細 */}
      <div className="mt-6 w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <h2 className="text-xl font-black text-slate-900">
            AI評価
          </h2>

          <span className="w-fit rounded-full bg-amber-400 px-4 py-2 text-base font-black text-slate-900 sm:text-lg">
            {news.score ?? 0}点 / 100点
          </span>

        </div>

        <div className="mt-6 space-y-5">

          {/* ニュース重要度 */}
          <div>

            <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">

              <span>📰 ニュース重要度</span>

              <span className="shrink-0">
                {news.importanceScore ?? 0} / 30
              </span>

            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-red-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((news.importanceScore ?? 0) /
                      30) *
                      100
                  )}%`,
                }}
              />

            </div>

          </div>

          {/* 話題性 */}
          <div>

            <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">

              <span>🔥 話題性</span>

              <span className="shrink-0">
                {news.buzzScore ?? 0} / 20
              </span>

            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-orange-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((news.buzzScore ?? 0) /
                      20) *
                      100
                  )}%`,
                }}
              />

            </div>

          </div>

          {/* 影響範囲 */}
          <div>

            <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">

              <span>🌏 影響範囲</span>

              <span className="shrink-0">
                {news.impactScore ?? 0} / 20
              </span>

            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-blue-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((news.impactScore ?? 0) /
                      20) *
                      100
                  )}%`,
                }}
              />

            </div>

          </div>

          {/* 新規性 */}
          <div>

            <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">

              <span>💡 新規性</span>

              <span className="shrink-0">
                {news.noveltyScore ?? 0} / 15
              </span>

            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-purple-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((news.noveltyScore ?? 0) /
                      15) *
                      100
                  )}%`,
                }}
              />

            </div>

          </div>

          {/* 今後の注目度 */}
          <div>

            <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">

              <span>📈 今後の注目度</span>

              <span className="shrink-0">
                {news.attentionScore ?? 0} / 15
              </span>

            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-green-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((news.attentionScore ?? 0) /
                      15) *
                      100
                  )}%`,
                }}
              />

            </div>

          </div>

        </div>
      </div>

      {/* やんすAIの視点 */}
      <section className="mt-8 overflow-hidden rounded-3xl border border-blue-200 bg-blue-50 shadow-lg">

        <div className="border-b border-blue-200 bg-white px-6 py-5 sm:px-8">

          <p className="text-xs font-black tracking-[0.2em] text-blue-600">
            YANSU AI VIEW
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
            やんすAIの視点
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            AI NEWS ジャパン独自の視点から、このニュースをひとこと解説します。
          </p>

        </div>

        <div className="p-6 sm:p-8">

          <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-blue-200">
                <img
                  src="/yans-ai.jpg"
                  alt="やんすAI"
                  className="h-full w-full object-cover"
                />
              </div>

              <div>
                <p className="font-black text-slate-900">
                  やんすAI
                </p>

                <p className="text-xs text-blue-500">
                  AI NEWS ジャパン
                </p>
              </div>

            </div>

            {news.supplement ? (
              <p className="mt-4 border-l-4 border-violet-500 pl-4 text-sm leading-7 text-slate-700 sm:text-base">
                {news.supplement}
              </p>
            ) : (
              <p className="mt-5 border-l-4 border-amber-400 pl-4 text-base font-bold leading-8 text-slate-700 sm:text-lg">
                「{yansuComment}」
              </p>
            )}

          </div>

        </div>

      </section>

      {/* おすすめサービス */}
      {recommendedAffiliates.length > 0 && (
        <section className="mt-10 rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5 sm:px-8">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-[11px] font-bold tracking-[0.2em] text-blue-600">
                  PICK UP
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                  この記事に関連するサービス
                </h2>

              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-400">
                PR
              </span>

            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              この記事の内容に関連した、読者に役立つサービスをご紹介します。
            </p>

          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-7">

            {recommendedAffiliates.map((program) => (
              <div
                key={program.id}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl motion-safe:animate-[affiliateFloat_4s_ease-in-out_infinite]"
              >

                {/* 広告画像 */}
{program.imageUrl && (
  <a
    href={program.url}
    target="_blank"
    rel="nofollow sponsored noopener noreferrer"
    className="flex h-72 w-full items-center justify-center overflow-hidden border-b border-slate-100 bg-white p-1 sm:h-80 lg:h-96"
  >
    <img
      src={program.imageUrl}
      alt={program.name}
      className="block h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
    />
  </a>
)}

                {/* 広告情報 */}
                <div className="flex flex-1 flex-col p-5 sm:p-6">

                  <div className="mb-3 flex items-center gap-2">

                    <span className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-black text-white">
                      おすすめ
                    </span>

                    <span className="text-[11px] text-slate-400">
                      PR
                    </span>

                  </div>

                  <h3 className="text-lg font-black leading-7 text-slate-900 sm:text-xl">
                    {program.name}
                  </h3>

                  {program.description && (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {program.description}
                    </p>
                  )}

                  {program.keywords && (
                    <div className="mt-3 flex flex-wrap gap-1.5">

                      {program.keywords
                        .split(",")
                        .map((keyword: string) =>
                          keyword.trim()
                        )
                        .filter(Boolean)
                        .slice(0, 3)
                        .map((keyword: string) => (
                          <span
                            key={keyword}
                            className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500"
                          >
                            {keyword}
                          </span>
                        ))}

                    </div>
                  )}

                  <a
                    href={program.url}
                    target="_blank"
                    rel="nofollow sponsored noopener noreferrer"
                    className="mt-auto pt-5 text-sm font-bold text-blue-600 transition hover:text-blue-800"
                  >
                    詳細を見る →
                  </a>

                </div>

              </div>
            ))}

          </div>

          <div className="border-t border-slate-100 px-6 py-3 sm:px-8">

            <p className="text-[11px] text-slate-400">
              ※広告・アフィリエイトリンクを含みます
            </p>

          </div>

        </section>
      )}

      {/* シェア */}
<div className="mt-8 rounded-3xl bg-white p-6 shadow-lg">

  <h2 className="mb-4 text-xl font-black">
    この記事をシェア
  </h2>

  <div className="flex flex-wrap gap-3">

    <a
      href={`/api/news/share?newsId=${news.id}&type=x`}
      className="rounded-full bg-black px-5 py-3 font-bold text-white"
    >
      Xでシェア
    </a>

    <a
      href={`/api/news/share?newsId=${news.id}&type=line`}
      className="rounded-full bg-green-500 px-5 py-3 font-bold text-white"
    >
      LINEで共有
    </a>

    <a
      href={`/api/news/share?newsId=${news.id}&type=facebook`}
      className="rounded-full bg-blue-600 px-5 py-3 font-bold text-white"
    >
      Facebook
    </a>

    <a
      href={`/api/news/share?newsId=${news.id}&type=threads`}
      className="rounded-full bg-gray-900 px-5 py-3 font-bold text-white"
    >
      Threads
    </a>

    <a
      href={`/api/news/share?newsId=${news.id}&type=hatena`}
      className="rounded-full bg-blue-500 px-5 py-3 font-bold text-white"
    >
      はてなブックマーク
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
                        ).toLocaleDateString(
                          "ja-JP"
                        )
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
    </>
  );
}