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

  let normalAdded = 0;
  let entertainmentAdded = 0;

  for (const item of items) {
    // 国内ニュースは最大20件、芸能は最大5件
    if (
      item.source === "マイナビ芸能" &&
      entertainmentAdded >= 5
    ) {
      continue;
    }

    if (
      item.source !== "マイナビ芸能" &&
      normalAdded >= 20
    ) {
      continue;
    }

    const title = item.title ?? "";
    const sourceUrl = item.link ?? "";

    if (!title || !sourceUrl) {
      continue;
    }

    // すでに存在する記事は処理しない
    const exists = await prisma.news.findUnique({
      where: {
        sourceUrl,
      },
    });

    if (exists) {
      skipped++;
      continue;
    }

    // 新規記事だけ重い処理を実行
    const image = await getImage(sourceUrl);
    const article = await getArticle(sourceUrl);

    let ai;

    if (item.source === "マイナビ芸能") {
      ai =
        article.length > 300
          ? await analyzeArticle(title, article)
          : {
              summary: title,
              category: "芸能",
              score: 60,
              importanceScore: 18,
              buzzScore: 12,
              impactScore: 12,
              noveltyScore: 9,
              attentionScore: 9,
            };

      // マイナビ芸能は必ず「芸能」
      ai.category = "芸能";
    } else {
      ai =
        article.length > 300
          ? await analyzeArticle(title, article)
          : {
              summary: title,
              category: "国内",
              score: 60,
              importanceScore: 18,
              buzzScore: 12,
              impactScore: 12,
              noveltyScore: 9,
              attentionScore: 9,
            };
    }

    try {
      await prisma.news.create({
        data: {
          title: title,
          summary: ai.summary,
          category: ai.category,
          score: ai.score,

          // AI評価の詳細
          importanceScore: ai.importanceScore,
          buzzScore: ai.buzzScore,
          impactScore: ai.impactScore,
          noveltyScore: ai.noveltyScore,
          attentionScore: ai.attentionScore,

          image: image,
          source: item.source ?? "RSS",
          sourceUrl: sourceUrl,

          publishedAt: item.pubDate
            ? new Date(item.pubDate)
            : item["dc:date"]
              ? new Date(item["dc:date"])
              : null,
        },
      });

      added++;

      if (item.source === "マイナビ芸能") {
        entertainmentAdded++;
        console.log("芸能追加:", title);
      } else {
        normalAdded++;
        console.log("追加:", title);
      }
    } catch (error: any) {
      // 同じ記事が別の同期処理で先に追加された場合
      if (error?.code === "P2002") {
        skipped++;
        console.log("重複スキップ:", title);
        continue;
      }

      throw error;
    }
  }

  return {
    success: true,
    added,
    updated,
    skipped,
    total: items.length,
  };
}