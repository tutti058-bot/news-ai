import NewsCard from "./NewsCard";
import { prisma } from "@/lib/prisma";

interface NewsGridProps {
  keyword?: string;
}

export default async function NewsGrid({
  keyword = "",
}: NewsGridProps) {
  const news = await prisma.news.findMany({
    where: keyword
      ? {
          OR: [
            {
              title: {
                contains: keyword,
              },
            },
            {
              summary: {
                contains: keyword,
              },
            },
          ],
        }
      : undefined,
    orderBy: {
      publishedAt: "desc",
    },
    take: 30,
  });

  console.log("News count:", news.length);

  return (
    <section>
      <div className="mb-10 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
            LATEST NEWS
          </p>

          <h2 className="mt-2 text-4xl font-black text-slate-900">
            最新ニュース
          </h2>

          <p className="mt-2 text-slate-600">
            AIが選んだ最新ニュースをリアルタイムで表示
          </p>
        </div>

        <button className="rounded-full border border-slate-300 px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-900 hover:text-white">
          もっと見る
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {news.map((item) => (
          <NewsCard
            key={item.id}
            id={item.id}
            title={item.title}
            summary={item.summary ?? ""}
            image={item.image || "/news.jpg"}
            category={item.category ?? "国内"}
            date={
              item.publishedAt
                ? new Date(item.publishedAt).toLocaleDateString("ja-JP")
                : ""
            }
          />
        ))}
      </div>
    </section>
  );
}