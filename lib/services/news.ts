import { prisma } from "@/lib/prisma";
import { fetchNews } from "@/lib/fetchNews";
import { analyzeArticle } from "@/lib/ai";
import { getImage } from "@/lib/getImage";
import { getArticle } from "@/lib/getArticle";

export async function syncNews() {
  const items = await fetchNews();
  let added = 0;
  let skipped = 0;

  for (const item of items) {
  if (added >= 20) break;
    const title = item.title ?? "";
    const sourceUrl = item.link ?? "";

    if (!title || !sourceUrl) continue;

    // すでに存在する記事は処理しない
    const exists = await prisma.news.findUnique({
      where: {
        sourceUrl,
      },
    });

    if (exists) {
      skipped++;
      console.log("スキップ:", title);
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
    skipped,
    total: items.length,
  };
}
