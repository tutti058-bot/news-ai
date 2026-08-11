import { prisma } from "@/lib/prisma";
import { fetchNews } from "@/lib/fetchNews";
import { analyzeArticle } from "@/lib/ai";
import { getImage } from "@/lib/getImage";
import { getArticle } from "@/lib/getArticle";

function normalizeUrl(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const start = value.indexOf("](");
  const end = value.lastIndexOf(")");

  if (start !== -1 && end > start + 2) {
    const url = value.slice(start + 2, end);

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
  }

  return value;
}

export async function syncNews() {
  const items = await fetchNews();

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    if (added + updated >= 20) break;

    const title = item.title ?? "";
    const sourceUrl = normalizeUrl(item.link);

    if (!title || !sourceUrl) continue;

    const publishedAt = item.pubDate
      ? new Date(item.pubDate)
      : null;

    const allNews = await prisma.news.findMany({
      select: {
        id: true,
        title: true,
        sourceUrl: true,
        publishedAt: true,
      },
    });

    const exists = allNews.find(
      (news) => normalizeUrl(news.sourceUrl) === sourceUrl
    );

    if (exists) {
      const shouldUpdate =
        publishedAt &&
        (!exists.publishedAt ||
          publishedAt.getTime() > exists.publishedAt.getTime());

      if (shouldUpdate) {
        await prisma.news.update({
          where: {
            id: exists.id,
          },
          data: {
            title,
            sourceUrl,
            publishedAt,
          },
        });

        updated++;
        console.log("更新:", title);
      } else {
        skipped++;
        console.log("スキップ:", title);
      }

      continue;
    }

    const image = await getImage(sourceUrl);
    const article = await getArticle(sourceUrl);

    const ai =
      article.length > 300
        ? await analyzeArticle(title, article)
        : {
            summary: title,
            category: "国内",
            score: 60,
            tweet: "",
          };

    await prisma.news.create({
      data: {
        title,
        summary: ai.summary,
        category: ai.category,
        score: ai.score,
        image,
        source: item.source ?? "RSS",
        sourceUrl,
        publishedAt,
      },
    });

    added++;
    console.log("追加:", title);
  }

  return {
    success: true,
    added,
    updated,
    skipped,
    total: items.length,
  };
}