import NewsCard from "@/components/NewsCard";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function SearchPage({
  searchParams,
}: Props) {
  const { q = "" } = await searchParams;
  const keyword = q.trim();

  const news = keyword
    ? await prisma.news.findMany({
        where: {
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
        },
        orderBy: {
          publishedAt: "desc",
        },
      })
    : [];

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 md:py-14">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
        {keyword ? `「${keyword}」の検索結果` : "ニュースを検索"}
      </h1>

      {!keyword ? (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-bold text-slate-900">
            キーワードを入力してニュースを検索してください。
          </p>
        </div>
      ) : news.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-bold text-slate-900">
            該当するニュースが見つかりませんでした。
          </p>
          <p className="mt-2 text-sm text-slate-500">
            別のキーワードで検索してみてください。
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {news.map((item) => (
            <NewsCard
              key={item.id}
              id={item.id}
              title={item.title}
              summary={item.summary ?? ""}
              image={item.image ?? "/news.jpg"}
              category={item.category ?? "国内"}
              score={item.score ?? 60}
              date={
                item.publishedAt
                  ? item.publishedAt.toLocaleDateString("ja-JP")
                  : ""
              }
            />
          ))}
        </div>
      )}
    </main>
  );
}
