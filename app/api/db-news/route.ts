import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rawNews = await prisma.news.findMany({
    orderBy: {
      publishedAt: "desc",
    },
    take: 100,
  });

  const news = rawNews
    .filter((item) => {
      const isSoccer =
        item.source === "ゲキサカ" ||
        item.category === "サッカー";

      if (!isSoccer) {
        return true;
      }

      return (item.score ?? 0) >= 90;
    })
    .slice(0, 30);

  return NextResponse.json(news);
}
