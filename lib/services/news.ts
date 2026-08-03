import { prisma } from "@/lib/prisma";
import { fetchNews } from "@/lib/fetchNews";
import {
  generateSummary,
  generateCategory,
  generateScore,
} from "@/lib/ai";
import { getImage } from "@/lib/getImage";

export async function syncNews() {
  const items = await fetchNews();

  for (const item of items) {
    const title = item.title ?? "";
    const sourceUrl = item.link ?? "";

    if (!sourceUrl) continue;

    const exists = await prisma.news.findUnique({
      where: {
        sourceUrl,
      },
    });

    if (exists) continue;

  const summary = await generateSummary(title);
  const category = await generateCategory(title);
  const score = 50;
  const image = await getImage(sourceUrl);

    await prisma.news.create({
      data: {
        title,
        summary,
        category,
        score,
        image,
        sourceUrl,
        source: "Google News",
        publishedAt: item.pubDate
          ? new Date(item.pubDate)
          : null,
      },
    });
  }

  return {
    success: true,
    count: items.length,
  };
}