import { prisma } from "@/lib/prisma";

export async function getRanking() {
  return prisma.news.findMany({
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