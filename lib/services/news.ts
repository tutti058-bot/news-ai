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


function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[「」『』【】［］（）()！？!?。、,.・:：;；\s]/g, "")
    .trim();
}

function titleTokens(title: string): Set<string> {
  const normalized = title
    .toLowerCase()
    .replace(
      /[「」『』【】［］\[\]（）()！？!?、。，．・:：;；"'`’‘/／\\|｜\-—_]/g,
      ""
    )
    .replace(/\s+/g, "");

  const tokens = new Set<string>();

  // 日本語の2文字gram
  for (let i = 0; i < normalized.length - 1; i++) {
    tokens.add(normalized.slice(i, i + 2));
  }

  // 英数字キーワード
  const latinTokens =
    normalized.match(/[a-z0-9]{2,}/g) ?? [];

  for (const token of latinTokens) {
    tokens.add(token);
  }

  return tokens;
}

function isSimilarTitle(
  a: string,
  b: string
): boolean {
  if (!a || !b) {
    return false;
  }

  const aTokens = titleTokens(a);
  const bTokens = titleTokens(b);

  if (aTokens.size === 0 || bTokens.size === 0) {
    return false;
  }

  let overlap = 0;

  for (const token of aTokens) {
    if (bTokens.has(token)) {
      overlap++;
    }
  }

  const smaller =
    Math.min(aTokens.size, bTokens.size);

  const larger =
    Math.max(aTokens.size, bTokens.size);

  const containment = overlap / smaller;
  const jaccard =
    overlap / (aTokens.size + bTokens.size - overlap);

  // 同じニュースタイトルと判断しやすい条件
  if (overlap >= 8 && containment >= 0.55) {
    return true;
  }

  if (overlap >= 12 && jaccard >= 0.35) {
    return true;
  }

  // 短いタイトルはより厳しく判定
  if (smaller <= 12 && overlap >= 6 && containment >= 0.7) {
    return true;
  }

  return false;
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
 * ニュース化しないジャンル
 *
 * ゲーム・アニメ・アイドル系は、
 * 話題性だけ高くなりやすいため原則除外。
 */
function isExcludedTopic(
  title: string,
  category: string,
  source: string
): boolean {
  const t = `${title} ${category} ${source}`.toLowerCase();

  const excludeWords = [
    "ゲーム",
    "game",
    "アニメ",
    "anime",
    "アイドル",
    "idol",
    "ジュニアアイドル",
    "u-15",
    "u15",
    "u-19",
    "u19",
    "u-20",
    "u20",
    "ジュニアユース",
    "jrユース",
    "jr.ユース",
    "クラブユース",
  ];

  return excludeWords.some((word) =>
    t.includes(word.toLowerCase())
  );
}


/**
 * 芸能トレンドニュース
 *
 * 熱愛・結婚・破局など、
 * 話題性の高い芸能ニュースを優先して処理する。
 */
function isEntertainmentTrend(title: string): boolean {
  const t = title.toLowerCase();

  const trendWords = [
    "熱愛",
    "交際",
    "恋愛",
    "結婚",
    "婚約",
    "入籍",
    "結婚発表",
    "結婚報告",
    "婚約発表",
    "婚約報告",
    "破局",
    "離婚",
    "離婚発表",
    "離婚報告",
    "別居",
    "復縁",
    "再婚",
    "妊娠",
    "出産",
    "第1子",
    "第２子",
    "第2子",
    "第3子",
    "第３子",
  ];

  return trendWords.some((word) =>
    t.includes(word.toLowerCase())
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
    "u-13",
    "u13",
    "u-12",
    "u12",
    "ジュニアユース",
    "クラセン",

    // 中学生年代・中学校サッカーは除外
    "中学校サッカー",
    "中学サッカー",
    "中学生",
    "中学校",
    "全国中学校",
    "全国中学",
    "全中",

    "高校サッカー",
    "高校生",
    "大学サッカー",
    "大学生",
    "中学生年代",
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

export async function syncNews(limit?: number) {
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
  let skippedDuplicate = 0;
  let skippedShort = 0;
  let skippedNoImage = 0;
  let skippedLowScore = 0;
  let skippedAI = 0;

  // 通常ニュース
  let normalAdded = 0;

  // サッカーニュース
  let soccerAdded = 0;

  // 芸能ニュース
  let entertainmentAdded = 0;

  // テクノロジーニュース
  let technologyAdded = 0;

  // テクノロジーは最大8件まで
  const TECHNOLOGY_LIMIT = 8;

  /*
   * 芸能トレンドを優先して処理
   *
   * 芸能ニュースの取得上限10件があるため、
   * 熱愛・結婚・破局などを先にAI分析する。
   */
  const sortedItems = [...items].sort((a, b) => {
    const aEntertainment =
      isEntertainmentSource(a.source ?? "");

    const bEntertainment =
      isEntertainmentSource(b.source ?? "");

    const aTrend =
      aEntertainment &&
      isEntertainmentTrend(a.title ?? "");

    const bTrend =
      bEntertainment &&
      isEntertainmentTrend(b.title ?? "");

    if (aTrend && !bTrend) return -1;
    if (!aTrend && bTrend) return 1;

    return 0;
  });

    /*
   * =========================
   * 新規記事候補
   * =========================
   *
   * 既存記事を除外したうえで、
   * 最大80件まで候補を集める。
   *
   * limit指定時は
   * 「AI評価する件数」ではなく
   * 「採用したい記事数」として扱う。
   */

  // 1回の同期は最大5件。
  // 4時間おきの実行を前提に、1日最大20件とする。
  const targetCount =
    typeof limit === "number" && limit > 0
      ? Math.min(limit, 5)
      : 5;

  // 日本時間の今日を基準に、1日20件を上限にする
  const now = new Date();
  const jstNow = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Tokyo",
    })
  );

  const jstStart = new Date(jstNow);
  jstStart.setHours(0, 0, 0, 0);

  const jstEnd = new Date(jstStart);
  jstEnd.setDate(jstEnd.getDate() + 1);

  // DBのUTC日時として検索するためJST境界をUTCに変換
  const todayStart = new Date(
    jstStart.getTime() - 9 * 60 * 60 * 1000
  );

  const todayEnd = new Date(
    jstEnd.getTime() - 9 * 60 * 60 * 1000
  );

  const todayAdded = await prisma.news.count({
    where: {
      createdAt: {
        gte: todayStart,
        lt: todayEnd,
      },
    },
  });

  const dailyRemaining = Math.max(
    0,
    30 - todayAdded
  );

  if (dailyRemaining === 0) {
    console.log(
      "本日の記事上限30件に到達。今回は保存しません。"
    );

    return {
      added: 0,
      skipped: 0,
      message: "本日の記事上限30件に到達",
    };
  }

  const actualTargetCount = Math.min(
    targetCount,
    dailyRemaining
  );

  const candidateItems: typeof sortedItems = [];

  // テクノロジーを優先するため、
  // 新規候補を「テクノロジー → その他」の順に並べる。
  const technologyItems = sortedItems.filter(
    (item) =>
      (item.category ?? "") === "テクノロジー"
  );

  const otherItems = sortedItems.filter(
    (item) =>
      (item.category ?? "") !== "テクノロジー"
  );

  const prioritizedItems = [
    ...technologyItems,
    ...otherItems,
  ];

  for (const item of prioritizedItems) {
    if (candidateItems.length >= 20) {
      break;
    }

    const candidateUrl = normalizeUrl(
      item.link ?? ""
    );

    if (!candidateUrl) {
      continue;
    }

    const candidateExists =
      await prisma.news.findUnique({
        where: {
          sourceUrl: candidateUrl,
        },
      });

    if (candidateExists) {
      continue;
    }

    const candidateTitle = item.title ?? "";
    const candidateCategory = item.category ?? "";
    const candidateSource = item.source ?? "";

    // ゲーム・アニメ・アイドル等はAIに送る前に除外
    if (
      isExcludedTopic(
        candidateTitle,
        candidateCategory,
        candidateSource
      )
    ) {
      console.log(
        "対象外ジャンルのためスキップ:",
        candidateTitle
      );
      continue;
    }

    const recentNews = await prisma.news.findMany({
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 100,
    });

    const hasSimilarTitle = recentNews.some(
      (existing) =>
        isSimilarTitle(
          candidateTitle,
          existing.title
        )
    );

    if (hasSimilarTitle) {
      console.log(
        "既存記事との類似のためスキップ:",
        candidateTitle
      );
      continue;
    }

    /*
     * =========================
     * 今回の取得候補同士の類似チェック
     * =========================
     *
     * 同じ同期処理で取得した
     * 大谷翔平などの類似ニュースを
     * 複数掲載しない。
     */
    const hasCandidateSimilarTitle =
      candidateItems.some(
        (candidate) =>
          isSimilarTitle(
            candidateTitle,
            candidate.title ?? ""
          )
      );

    if (hasCandidateSimilarTitle) {
      console.log(
        "今回の候補内で類似のためスキップ:",
        candidateTitle
      );
      continue;
    }

    candidateItems.push(item);
  }

  console.log(
    `新規記事候補: ${candidateItems.length}件`
  );

  console.log(
    `採用目標: ${targetCount}件`
  );

  for (const item of candidateItems) {
    const source = item.source ?? "";

    const entertainment =
      isEntertainmentSource(source);

    const soccer =
      source === "ゲキサカ";

    const title = item.title ?? "";

    // =========================
    // 芸能ニュース取得状況の調査ログ
    // =========================
    if (entertainment) {
      console.log(
        "================ 芸能候補 ================"
      );
      console.log("ソース:", source);
      console.log("タイトル:", title);
      console.log("URL:", item.link ?? "");
      console.log(
        "トレンド判定:",
        isEntertainmentTrend(title)
          ? "優先対象"
          : "通常"
      );
      console.log(
        "=========================================="
      );
    }

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
     * → 最大8件
     *
     * サッカーニュース
     * → ゲキサカ最大3件
     *
     * 芸能ニュース
     * → ORICON + マイナビ合計10件
     */

    if (
      entertainment &&
      entertainmentAdded >= 8
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
      (item.category ?? "") === "テクノロジー" &&
      technologyAdded >= TECHNOLOGY_LIMIT
    ) {
      continue;
    }

    if (
      !entertainment &&
      !soccer &&
      (item.category ?? "") !== "テクノロジー" &&
      normalAdded >= 5
    ) {
      continue;
    }

    // 必要件数に達したカテゴリは以降の候補を処理しない
    if (
      entertainment && entertainmentAdded >= 8 ||
      soccer && soccerAdded >= 3 ||
      !entertainment && !soccer && normalAdded >= 5
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

      skipped++;
      skippedDuplicate++;
      continue;
    }

    console.log(
      "★ 新規記事候補:",
      title
    );

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
      console.log(">>> 本文取得開始");
      article = await getArticle(
        sourceUrl
      );
      console.log("<<< 本文取得終了");
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
      skippedShort++;
      continue;
    }

    /*
     * =========================
     * 画像取得
     * =========================
     */

    let image: string | null = null;

    try {
      console.log(">>> 画像取得開始");
      image = await getImage(
        sourceUrl
      );
      console.log("<<< 画像取得終了");
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
      skippedNoImage++;
      continue;
    }

    /*
     * =========================
     * AI分析
     * =========================
     */

    let ai;

    try {
      console.log(">>> AI分析開始");
      ai = await analyzeArticle(
        title,
        article.slice(0, 3000)
      );
      console.log("<<< AI分析終了");
      console.log("AI評価結果:", {
        title,
        category: ai?.category,
        score: ai?.score,
        importanceScore: ai?.importanceScore,
        buzzScore: ai?.buzzScore,
        impactScore: ai?.impactScore,
        noveltyScore: ai?.noveltyScore,
        attentionScore: ai?.attentionScore,
      });
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

    /*
 * =========================
 * AIスコアによる掲載判定
 * =========================
 *
 * サッカー
 * → 80点以上
 *
 * 芸能
 * → 75点以上
 *
 * テクノロジー
 * → 80点以上
 *
 * その他
 * → 60点以上
 */

const aiCategory = ai?.category ?? "";

let MIN_SCORE = 60;

if (soccer || aiCategory === "サッカー") {
  MIN_SCORE = 80;
} else if (
  entertainment ||
  aiCategory === "芸能"
) {
  MIN_SCORE = 75;
} else if (
  aiCategory === "テクノロジー"
) {
  MIN_SCORE = 80;
}

if (ai.score < MIN_SCORE) {
  console.log(
    `低スコアのためスキップ: ${ai.score}点（基準: ${MIN_SCORE}点）`,
    title
  );

  skipped++;
  skippedLowScore++;
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
      skippedAI++;
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

          content:
            article,

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
      if (added >= actualTargetCount) {
        break;
      }

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
      } else if (
        (item.category ?? "") === "テクノロジー"
      ) {
        technologyAdded++;

        console.log(
          "テクノロジー追加:",
          title
        );

        console.log(
          `テクノロジー件数: ${technologyAdded}/${TECHNOLOGY_LIMIT}`
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
    `テクノロジーニュース: ${technologyAdded}`
  );

  console.log(
    `サッカーニュース: ${soccerAdded}`
  );

  console.log(
    `スキップ: ${skipped}`
  );

  console.log(`  重複: ${skippedDuplicate}`);
  console.log(`  本文不足: ${skippedShort}`);
  console.log(`  画像なし: ${skippedNoImage}`);
  console.log(`  低スコア: ${skippedLowScore}`);
  console.log(`  AI結果なし: ${skippedAI}`);

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