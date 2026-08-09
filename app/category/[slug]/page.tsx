import { prisma } from "@/lib/prisma";
import NewsCard from "@/components/NewsCard";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  const category = decodeURIComponent(slug);

  const news = await prisma.news.findMany({
    where: {
      category: category,
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10">
        <p className="text-sm font-bold text-blue-600">
          AI NEWS ジャパン
        </p>

        <h1 className="mt-2 text-4xl font-black text-slate-900">
          {category}ニュース
        </h1>

        <p className="mt-3 text-slate-500">
          {category}に関する最新ニュースをAIがわかりやすくお届けします。
        </p>
      </div>

      {news.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-lg font-bold text-slate-700">
            {category}のニュースはまだありません。
          </p>

          <p className="mt-2 text-sm text-slate-500">
            最新ニュースが追加されると、こちらに表示されます。
          </p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {news.map((item) => (
            <NewsCard
              key={item.id}
              id={item.id}
              title={item.title}
              summary={item.summary ?? ""}
              image={item.image ?? "/news.jpg"}
              category={item.category ?? "国内"}
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
