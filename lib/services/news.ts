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

/**
 * ゲキサカのAI分析前フィルター
 *
 * U-15/U-18などの育成年代の記事を除外し、
 * 日本代表・海外日本人選手などを優先する。
 */
function shouldAnalyzeSoccer(title: string): boolean {
  const t = title.toLowerCase();

  // 育成年代・アマチュア系は除外
  const excludeWords = [
    "u-15",
    "u15",
    "u-18",
    "u18",
    "u-17",
    "u17",
    "u-16",
    "u16",
    "u-14",
    "u14",
    "ジュニアユース",
    "クラセン",
    "高校サッカー",
    "大学サッカー",
    "なでしこ",
  ];

  if (
    excludeWords.some((word) =>
      t.includes(word)
    )
  ) {
    return false;
  }

  return true;
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

  // サッカーニュース
  let soccerAdded = 0;

  // 芸能ニュース
  let entertainmentAdded = 0;

  for (const item of items) {
    const source = item.source ?? "";

    const entertainment =
      isEntertainmentSource(source);

    const soccer =
      source === "ゲキサカ";

    const title = item.title ?? "";

    // ゲキサカはAI分析前に不要記事を除外
    if (
      soccer &&
      !shouldAnalyzeSoccer(title)
    ) {
      console.log(
        "サッカー事前除外:",
        title
      );
      continue;
    }

    /*
     * =========================
     * 取得件数制限
     * =========================
     *
     * 通常ニュース
     * → 最大20件
     *
     * サッカーニュース
     * → ゲキサカ最大3件
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
      soccer &&
      soccerAdded >= 3
    ) {
      continue;
    }

    if (
      !entertainment &&
      !soccer &&
      normalAdded >= 20
    ) {
      continue;
    }

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
       * 画像取得に失敗した場合は
       * 記事自体を保存しない
       */

      image = null;
    }

    /*
     * =========================
     * 画像がない記事は除外
     * =========================
     *
     * NO IMAGEの記事を
     * サイトに表示させない。
     *
     * また、AI分析前に除外することで
     * OpenAIの無駄な使用も防ぐ。
     */

    if (!image) {
      console.log(
        "画像取得できないためスキップ:",
        title
      );

      skipped++;
      continue;
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
        article.slice(0, 3000)
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
     * 低優先度ニュース除外
     * =========================
     */

    const MIN_SCORE = 70;

    if (ai.score < MIN_SCORE) {
      console.log(
        `低スコアのためスキップ: ${ai.score}点`,
        title
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
      } else if (soccer) {
        soccerAdded++;

        console.log(
          "サッカー追加:",
          title
        );

        console.log(
          `サッカー件数: ${soccerAdded}/3`
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
    `サッカーニュース: ${soccerAdded}`
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

    soccerAdded,
  };
}