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

/**
 * 芸能ニュースとして扱う取得元
 */
function isEntertainmentSource(source: string): boolean {
  return (
    source === "マイナビ芸能" ||
    source === "ORICON NEWS"
  );
}

export async function syncNews() {
  console.log("=== SYNC START ===");

  console.log("① fetchNews開始");

  const items = await fetchNews();

  console.log(
    "② fetchNews完了:",
    items.length,
    "件"
  );

  let added = 0;
  let updated = 0;
  let skipped = 0;

  // 通常ニュース
  let normalAdded = 0;

  // 芸能ニュース
  let entertainmentAdded = 0;

  for (const item of items) {
    const source = item.source ?? "";

    const entertainment =
      isEntertainmentSource(source);

    /*
     * =========================
     * 取得件数制限
     * =========================
     *
     * 通常ニュース
     * → 最大20件
     *
     * 芸能ニュース
     * → ORICON + マイナビ合計10件
     */

    if (
      entertainment &&
      entertainmentAdded >= 10
    ) {
      continue;
    }

    if (
      !entertainment &&
      normalAdded >= 20
    ) {
      continue;
    }

    const title = item.title ?? "";

    const sourceUrl = normalizeUrl(
      item.link ?? ""
    );

    if (!title || !sourceUrl) {
      continue;
    }

    /*
     * =========================
     * 重複チェック
     * =========================
     */

    const exists =
      await prisma.news.findUnique({
        where: {
          sourceUrl,
        },
      });

    if (exists) {
  console.log(
    "重複スキップ:",
    title
  );

  console.log(
    "重複URL:",
    sourceUrl
  );

  skipped++;
  continue;
}

    console.log(
      "================================"
    );

    console.log(
      "取得開始:",
      title
    );

    console.log(
      "取得元:",
      source
    );

    console.log(
      "URL:",
      sourceUrl
    );

    /*
     * =========================
     * 本文取得
     * =========================
     */

    let article: string | null = null;

    try {
      article = await getArticle(
        sourceUrl
      );
    } catch (error) {
      console.error(
        "本文取得エラー:",
        title,
        error
      );

      skipped++;
      continue;
    }

    /*
     * 本文が短すぎる場合は保存しない
     */

    if (
      !article ||
      article.length < 300
    ) {
      console.log(
        "本文取得不十分のためスキップ:",
        title
      );

      skipped++;
      continue;
    }

    /*
     * =========================
     * 画像取得
     * =========================
     */

    let image: string | null = null;

    try {
      image = await getImage(
        sourceUrl
      );
    } catch (error) {
      console.error(
        "画像取得エラー:",
        title,
        error
      );

      /*
       * 画像が取れなくても
       * 記事自体は保存する
       */

      image = null;
    }

    /*
     * =========================
     * AI分析
     * =========================
     */

    let ai;

    try {
      ai = await analyzeArticle(
        title,
        article
      );
    } catch (error) {
      console.error(
        "AI分析エラー:",
        title,
        error
      );

      skipped++;
      continue;
    }

    /*
     * =========================
     * カテゴリ調整
     * =========================
     */

    if (entertainment) {
      /*
       * ORICON NEWS
       * マイナビ芸能
       *
       * → 必ず芸能
       */

      ai.category = "芸能";
    }

    /*
     * AI分析結果チェック
     */

    if (!ai?.summary) {
      console.log(
        "AI分析結果がないためスキップ:",
        title
      );

      skipped++;
      continue;
    }

    /*
     * =========================
     * DB保存
     * =========================
     */

    try {
      await prisma.news.create({
        data: {
          title,

          summary:
            ai.summary,

          category:
            ai.category,

          score:
            ai.score,

          // AI評価の詳細
          importanceScore:
            ai.importanceScore,

          buzzScore:
            ai.buzzScore,

          impactScore:
            ai.impactScore,

          noveltyScore:
            ai.noveltyScore,

          attentionScore:
            ai.attentionScore,

          image,

          source:
            source || "RSS",

          sourceUrl,

          publishedAt:
            item.pubDate
              ? new Date(item.pubDate)
              : item["dc:date"]
                ? new Date(
                    item["dc:date"]
                  )
                : null,
        },
      });

      added++;

      /*
       * =========================
       * 件数カウント
       * =========================
       */

      if (entertainment) {
        entertainmentAdded++;

        console.log(
          "芸能追加:",
          title
        );

        console.log(
          `芸能件数: ${entertainmentAdded}/10`
        );
      } else {
        normalAdded++;

        console.log(
          "通常ニュース追加:",
          title
        );

        console.log(
          `通常ニュース件数: ${normalAdded}/20`
        );
      }
    } catch (error: any) {
      /*
       * 同じ記事が別の同期処理で
       * 先に追加された場合
       */

      if (
        error?.code === "P2002"
      ) {
        skipped++;

        console.log(
          "重複スキップ:",
          title
        );

        continue;
      }

      console.error(
        "DB保存エラー:",
        title,
        error
      );

      throw error;
    }
  }

  /*
   * =========================
   * 同期結果
   * =========================
   */

  console.log(
    "================================"
  );

  console.log(
    "ニュース同期完了"
  );

  console.log(
    `追加: ${added}`
  );

  console.log(
    `通常ニュース: ${normalAdded}`
  );

  console.log(
    `芸能ニュース: ${entertainmentAdded}`
  );

  console.log(
    `スキップ: ${skipped}`
  );

  console.log(
    `取得総数: ${items.length}`
  );

  console.log(
    "================================"
  );

  return {
    success: true,

    added,

    updated,

    skipped,

    total:
      items.length,

    normalAdded,

    entertainmentAdded,
  };
}