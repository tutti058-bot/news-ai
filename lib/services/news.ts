import { prisma } from "@/lib/prisma";
import { fetchNews } from "@/lib/fetchNews";
import { analyzeArticle } from "@/lib/ai";
import { getImage } from "@/lib/getImage";
import { getArticle } from "@/lib/getArticle";

export async function syncNews() {
  const items = await fetchNews();

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    if (added + updated >= 20) break;

    const title = item.title ?? "";
    const sourceUrl = item.link ?? "";

    if (!title || !sourceUrl) continue;

    const publishedAt = item.pubDate
      ? new Date(item.pubDate)
      : null;

    const exists = await prisma.news.findUnique({
      where: {
        sourceUrl,
      },
    });

    // 既存記事
    if (exists) {
      // RSS側の公開日時が新しくなっている場合だけ更新
      if (
        publishedAt &&
        (!exists.publishedAt ||
          publishedAt.getTime() > exists.publishedAt.getTime())
      ) {
        await prisma.news.update({
          where: {
            id: exists.id,
          },
          data: {
            title,
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

    // 新規記事だけ重い処理を実行
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