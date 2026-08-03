import { prisma } from "@/lib/prisma";
import NewsCard from "@/components/NewsCard";

type Props = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function SearchPage({
  searchParams,
}: Props) {
  const { q = "" } = await searchParams;

  const news = await prisma.news.findMany({
    where: {
      OR: [
        {
          title: {
            contains: q,
          },
        },
        {
          summary: {
            contains: q,
          },
        },
      ],
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  return (
    <main className="mx-auto max-w-7xl p-8">
      <h1 className="mb-8 text-4xl font-black">
        「{q}」の検索結果
      </h1>

      <div className="grid gap-8 md:grid-cols-2">
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
    </main>
  );
}