import { prisma } from "@/lib/prisma";
import { fetchNews } from "@/lib/fetchNews";
import { analyzeArticle } from "@/lib/ai";
import { getImage } from "@/lib/getImage";
import { getArticle } from "@/lib/getArticle";

function normalizeUrl(url: string): string {
  return url
    .replace(/&#45;/g, "-")
    .replace(/&#x2D;/gi, "-")
    .replace(/&amp;/g, "&")
    .trim();
}

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
    const sourceUrl = normalizeUrl(item.link ?? "");

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

    console.log("取得開始:", title);
    console.log("URL:", sourceUrl);

    // まず本文を取得
    const article = await getArticle(sourceUrl);

    // 本文が短すぎる場合は保存しない
    if (!article || article.length < 300) {
      console.log(
        "本文取得不十分のためスキップ:",
        title
      );

      skipped++;
      continue;
    }

    // 本文取得後に画像を取得
    const image = await getImage(sourceUrl);

    let ai;

    if (item.source === "マイナビ芸能") {
      ai = await analyzeArticle(
        title,
        article
      );

      // マイナビ芸能は必ず「芸能」
      ai.category = "芸能";
    } else {
      ai = await analyzeArticle(
        title,
        article
      );
    }

    if (!ai?.summary) {
      console.log(
        "AI分析結果がないためスキップ:",
        title
      );

      skipped++;
      continue;
    }

    try {
      await prisma.news.create({
        data: {
          title,
          summary: ai.summary,
          category: ai.category,
          score: ai.score,

          // AI評価の詳細
          importanceScore: ai.importanceScore,
          buzzScore: ai.buzzScore,
          impactScore: ai.impactScore,
          noveltyScore: ai.noveltyScore,
          attentionScore: ai.attentionScore,

          image,
          source: item.source ?? "RSS",
          sourceUrl,

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