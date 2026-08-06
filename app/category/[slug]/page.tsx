import { prisma } from "@/lib/prisma";
import Link from "next/link";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CategoryPage({
  params,
}: Props) {
  const { slug } = await params;

  const news = await prisma.news.findMany({
    where: {
      category: slug,
    },
    orderBy: {
      publishedAt: "desc",
    },
    take: 30,
  });

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-8 text-4xl font-black">
        {slug} ニュース
      </h1>

      <div className="space-y-6">
        {news.map((item) => (
          <Link
            key={item.id}
            href={`/news/${item.id}`}
            className="block rounded-xl border p-5 hover:bg-gray-50"
          >
            <h2 className="text-xl font-bold">
              {item.title}
            </h2>

            <p className="mt-2 text-gray-600">
              {item.summary}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}