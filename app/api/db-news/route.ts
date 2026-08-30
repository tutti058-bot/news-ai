import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const news = await prisma.news.findMany({
    where: {
      OR: [
        {
          source: {
            not: "ゲキサカ",
          },
        },
        {
          AND: [
            {
              source: "ゲキサカ",
            },
            {
              score: {
                gte: 90,
              },
            },
          ],
        },
      ],
    },
    orderBy: {
      publishedAt: "desc",
    },
    take: 30,
  });

  return NextResponse.json(news);
}
