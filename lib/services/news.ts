import { prisma } from "@/lib/prisma";
import { fetchNews } from "@/lib/fetchNews";
import { analyzeArticle } from "@/lib/ai";
import { getImage } from "@/lib/getImage";
import { getArticle } from "@/lib/getArticle";

export async function syncNews() {
  const items = (await fetchNews()).slice(0, 20);

  let added = 0;
  let updated = 0;

  for (const item of items) {
    const title = item.title ?? "";
    const sourceUrl = item.link ?? "";

    if (!title || !sourceUrl) continue;

    const exists = await prisma.news.findUnique({
      where: {
        sourceUrl,
      },
    });

    const image =
      exists?.image ?? (await getImage(sourceUrl));

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

    // 既存記事なら更新
    if (exists) {
      await prisma.news.update({
        where: {
          sourceUrl,
        },
        data: {
          image,
          summary: ai.summary,
          category: ai.category,
          score: ai.score,
        },
      });

      updated++;
      console.log("更新:", title);
      continue;
    }

    // 新規記事
    await prisma.news.create({
      data: {
        title,
        summary: ai.summary,
        category: ai.category,
        score: ai.score,
        image,
        source: item.source ?? "RSS",
        sourceUrl,
        publishedAt: item.pubDate
          ? new Date(item.pubDate)
          : null,
      },
    });

    added++;
    console.log("追加:", title);
  }

  return {
    success: true,
    added,
    updated,
    total: items.length,
  };
}
