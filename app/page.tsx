import Header from "@/components/Header";
import TrendingBar from "@/components/TrendingBar";
import HomeLayout from "@/components/HomeLayout";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
}) {
  const { q = "", page = "1" } = await searchParams;

  const trendingNews = await prisma.news.findMany({
    where: {
      publishedAt: {
        not: null,
      },
    },
    orderBy: [
      {
        views: "desc",
      },
      {
        publishedAt: "desc",
      },
    ],
    take: 6,
    select: {
      id: true,
      title: true,
      views: true,
    },
  });

  return (
    <>
      <Header />

      <TrendingBar news={trendingNews} />

      <HomeLayout
        keyword={q}
        page={Number(page)}
      />
    </>
  );
}