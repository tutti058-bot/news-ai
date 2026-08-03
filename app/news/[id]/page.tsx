import { prisma } from "@/lib/prisma";
import Link from "next/link";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewsDetail({ params }: Props) {
  const { id } = await params;

  const news = await prisma.news.findUnique({
    where: {
      id: Number(id),
    },
  });

  if (!news) {
    return (
      <main className="mx-auto max-w-4xl p-10">
        <h1 className="text-3xl font-bold">
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
    take: 4,
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/"
        className="text-blue-600 hover:underline"
      >
        ← トップへ戻る
      </Link>

      <img
        src={news.image ?? "/news.jpg"}
        alt={news.title}
        className="mt-8 h-[420px] w-full rounded-3xl object-cover"
      />

      <div className="mt-8 flex gap-3">
        <span className="rounded-full bg-red-500 px-4 py-2 text-white">
          {news.category}
        </span>

        <span className="rounded-full bg-amber-400 px-4 py-2 font-bold">
          AI {news.score}点
        </span>
      </div>

      <h1 className="mt-6 text-5xl font-black leading-tight">
        {news.title}
      </h1>

      <p className="mt-8 whitespace-pre-wrap text-xl leading-10 text-slate-700">
        {news.summary}
      </p>

      {news.sourceUrl && (
        <a
          href={news.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex rounded-full bg-blue-600 px-8 py-4 font-bold text-white hover:bg-blue-700"
        >
          元記事を読む →
        </a>
      )}

      <section className="mt-20">
        <h2 className="mb-8 text-3xl font-black">
          関連記事
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          {related.map((item) => (
            <Link
              key={item.id}
              href={`/news/${item.id}`}
              className="rounded-2xl border bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-xl"
            >
              <p className="text-sm font-semibold text-blue-600">
                {item.category}
              </p>

              <h3 className="mt-2 text-lg font-bold">
                {item.title}
              </h3>

              <p className="mt-3 line-clamp-3 text-sm text-slate-600">
                {item.summary}
              </p>

              <p className="mt-4 text-sm text-slate-400">
                {item.publishedAt
                  ? new Date(item.publishedAt).toLocaleDateString("ja-JP")
                  : ""}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}