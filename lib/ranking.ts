import { prisma } from "@/lib/prisma";

export async function getRanking() {
  const since = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  );

  return prisma.news.findMany({
    where: {
      publishedAt: {
        gte: since,
      },
    },
    orderBy: [
      {
        score: "desc",
      },
      {
        publishedAt: "desc",
      },
    ],
    take: 5,
    select: {
      id: true,
      title: true,
      score: true,
      publishedAt: true,
    },
  });
}