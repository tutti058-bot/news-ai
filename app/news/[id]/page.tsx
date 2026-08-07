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
      url: news.image ?? "https://tutti-news-ai-bay.vercel.app/news.jpg",
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
      url: news.image ?? "https://tutti-news-ai-bay.vercel.app/news.jpg",
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
      <main className="mx-auto max-w-5xl p-10">
        <h1 className="text-3xl font-black">
          記事が見つかりません
        </h1>
      </main>
    );
  }

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

const hashtags: string[] = [];

// カテゴリー別
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

// タイトルから自動追加
if (news.title.includes("OpenAI")) hashtags.push("#OpenAI");
if (news.title.includes("ChatGPT")) hashtags.push("#ChatGPT");
if (news.title.includes("Google")) hashtags.push("#Google");
if (news.title.includes("Apple")) hashtags.push("#Apple");
if (news.title.includes("Microsoft")) hashtags.push("#Microsoft");
if (news.title.includes("Cloudflare")) hashtags.push("#Cloudflare");
if (news.title.includes("Tesla")) hashtags.push("#Tesla");
if (news.title.includes("Meta")) hashtags.push("#Meta");

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

const stars = "★".repeat(postScore) + "☆".repeat(5 - postScore);
let aiComment = "一般的なニュースです。";

if (postScore === 5) {
  aiComment = "🔥 Xで話題になりやすいニュースです";
} else if (postScore === 4) {
  aiComment = "📈 多くの人が興味を持ちそうです";
} else if (postScore === 3) {
  aiComment = "👍 注目度は平均的です";
} else if (postScore === 2) {
  aiComment = "ℹ️ 興味がある人向けのニュースです";
} else {
  aiComment = "📌 ニッチな話題です";
}
const yansuComment = await generateYansuComment(
  news.title,
  news.score ?? 60,
  news.category ?? "国内"
);

const tweetText = `🚨 ${news.title}

👇 詳細はこちら
${url}

🤖 やんすAI
「${yansuComment}」`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

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
  🤖 AI {news.score}点
</span>

<span className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-bold text-slate-900">
  🔥 投稿おすすめ {stars}
</span>

<p className="w-full text-sm text-slate-600">
  🤖 {aiComment}
</p>

        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
          📅{" "}
          {news.publishedAt
            ? new Date(news.publishedAt).toLocaleDateString("ja-JP")
            : ""}
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

      <div className="mt-8 rounded-3xl bg-white p-6 shadow-lg">

        <h2 className="mb-4 text-xl font-black">
          この記事をシェア
        </h2>

        <div className="flex flex-wrap gap-3">

          <a
  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
  target="_blank"
  rel="noopener noreferrer"
  className="rounded-full bg-black px-5 py-3 font-bold text-white"
>
  🤖 Xでシェア
</a>

          <a
            href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(`https://tutti-news-ai-bay.vercel.app/news/${news.id}`)}`}
            target="_blank"
            className="rounded-full bg-green-500 px-5 py-3 font-bold text-white"
          >
            LINEで共有
          </a>

        </div>

      </div>

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

                <p className="mt-4 text-sm text-slate-400">
                  {item.publishedAt
                    ? new Date(item.publishedAt).toLocaleDateString("ja-JP")
                    : ""}
                </p>

              </div>

            </Link>
          ))}
        </div>

      </section>

          </main>
  );
}