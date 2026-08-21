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
 * AI分析前の共通フィルター
 *
 * 明らかに優先度の低い告知系記事を
 * OpenAIに送る前に除外する。
 */
function shouldAnalyzeArticle(
  title: string,
  source: string
): boolean {
  const t = title.toLowerCase();

  const excludeWords = [
    "プレゼント",
    "キャンペーン",
    "応募受付",
    "応募開始",
    "イベント開催",
    "イベント情報",

    // 番組告知
    "番組出演",
    "番組告知",
    "放送決定",
    "放送開始",
    "出演決定",

    // 舞台・映画関連の告知
    "舞台挨拶",
    "登壇決定",

    // 音楽系の告知
    "新曲発売",
    "新曲リリース",
    "リリース決定",
    "配信決定",
    "ライブ開催",
    "ツアー開催",
    "ライブ出演",
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

    /*
     * =========================
     * AI分析前の共通フィルター
     * =========================
     */

    if (
      !shouldAnalyzeArticle(
        title,
        source
      )
    ) {
      console.log(
        "AI分析前除外:",
        title
      );

      continue;
    }

    /*
     * =========================
     * サッカー事前フィルター
     * =========================
     */

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
     * → ゲキサカ最大5件
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
      soccerAdded >= 5
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
        article.slice(0, 1800)
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
     * =========================
     * AI分析結果チェック
     * =========================
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
          `サッカー件数: ${soccerAdded}/5`
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