import { XMLParser } from "fast-xml-parser";
import iconv from "iconv-lite";
import * as cheerio from "cheerio";

type Feed = {
  source: string;
  url: string;
  category?: string;
};

const feeds: Feed[] = [
  // =========================
  // 国内ニュース
  // =========================
  {
    source: "NHK",
    url: "https://www3.nhk.or.jp/rss/news/cat0.xml",
    category: "国内",
  },

  // =========================
  // テクノロジー
  // =========================
  {
    source: "ITmedia",
    url: "https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml",
    category: "テクノロジー",
  },

  {
    source: "Impress Watch",
    url: "https://www.watch.impress.co.jp/data/rss/1.0/ipw/feed.rdf",
    category: "テクノロジー",
  },

  {
    source: "GIGAZINE",
    url: "https://gigazine.net/news/rss_2.0/",
    category: "テクノロジー",
  },

    // =========================
  // サッカー
  // =========================
  {
    source: "ゲキサカ",
    url: "https://web.gekisaka.jp/feed",
    category: "サッカー",
  },

  // =========================
  // 芸能
  // =========================
  {
    source: "マイナビ芸能",
    url: "https://news.mynavi.jp/rss/entertainment/entertainment/geinou",
    category: "芸能",
  },
];

const parser = new XMLParser({
  ignoreAttributes: false,
});

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCharCode(Number(dec))
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeUrl(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const decoded = decodeHtmlEntities(value.trim());

  const markdownMatch = decoded.match(
    /\]\((https?:\/\/[^)]+)\)$/
  );

  if (markdownMatch?.[1]) {
    return markdownMatch[1];
  }

  const urlMatch = decoded.match(
    /https?:\/\/[^\s\])]+/
  );

  return urlMatch?.[0] ?? decoded;
}

/**
 * ORICON NEWS取得
 *
 * ORICONはRSSではなくHTMLを取得する。
 * ページはShift_JISなのでiconv-liteでデコードする。
 */
async function fetchOriconNews() {
  const news: any[] = [];

  try {
    console.log("ORICON NEWS: 取得開始");

    const res = await fetch("https://www.oricon.co.jp/news/", {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      console.error(
        `ORICON NEWS: HTTPエラー ${res.status}`
      );

      return news;
    }

    const buffer = Buffer.from(
      await res.arrayBuffer()
    );

    const html = iconv.decode(buffer, "Shift_JIS");

    const $ = cheerio.load(html);

    $("a[href^='/news/']").each((_, element) => {
      const href = $(element).attr("href");

      if (!href) {
        return;
      }

      // ページング・ランキング等は除外
      if (
        href.includes("/news/p/") ||
        href.includes("/news/rank/")
      ) {
        return;
      }

      // 記事URLだけ対象
      const match = href.match(
        /^\/news\/(\d+)\/?$/
      );

      if (!match) {
        return;
      }

      const articleId = match[1];

      const text = $(element)
        .text()
        .replace(/\s+/g, " ")
        .trim();

      if (!text) {
        return;
      }

      /*
       * ORICONの一覧テキストは
       *
       * タイトル 本文 日付 ニュース｜カテゴリ｜
       *
       * のような構造なので、
       * 最初の日時より前をタイトル候補として使用。
       */

      const dateMatch = text.match(
        /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/
      );

      let title = text;

      if (dateMatch?.index !== undefined) {
        title = text
          .slice(0, dateMatch.index)
          .trim();
      }

      /*
       * 本文がタイトルに混ざっている場合があるため、
       * ある程度短くする。
       */
      if (title.length > 120) {
        title = title.slice(0, 120);
      }

      if (!title) {
        return;
      }

      /*
       * 同じ記事がページ内に複数回登場する場合があるため、
       * articleIdで重複を防ぐ。
       */
      const sourceUrl =
        `https://www.oricon.co.jp/news/${articleId}/`;

      const exists = news.some(
        (item) => item.link === sourceUrl
      );

      if (exists) {
        return;
      }

      let pubDate: string | null = null;

      if (dateMatch) {
        pubDate =
          `${dateMatch[1]}T${dateMatch[2]}:00+09:00`;
      }

      news.push({
        title,
        link: sourceUrl,
        pubDate,
        source: "ORICON NEWS",
        feedCategory: "芸能",
      });
    });

    /*
     * ORICONは同じ記事が複数箇所に出ることがあるので
     * URL単位で最終的に重複除去。
     */
    const unique = Array.from(
      new Map(
        news.map((item) => [
          item.link,
          item,
        ])
      ).values()
    );

    /*
     * 新しい記事を優先。
     */
    unique.sort((a, b) => {
      const aTime = a.pubDate
        ? new Date(a.pubDate).getTime()
        : 0;

      const bTime = b.pubDate
        ? new Date(b.pubDate).getTime()
        : 0;

      return bTime - aTime;
    });

    /*
     * 取得しすぎないように最大30件。
     */
    const result = unique.slice(0, 30);

    console.log(
      `ORICON NEWS: ${result.length}件取得`
    );

    return result;
  } catch (error) {
    console.error(
      "ORICON NEWS: 取得エラー",
      error
    );

    return news;
  }
}

export async function fetchNews() {
  const news: any[] = [];

  // =========================
  // RSS取得
  // =========================

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        cache: "no-store",
      });

      if (!res.ok) {
        console.error(
          `${feed.source}: RSS取得失敗 ${res.status}`
        );

        continue;
      }

      const xml = await res.text();

      const json = parser.parse(xml);

      const items =
        json?.rss?.channel?.item ??
        json?.rdf?.item ??
        json?.["rdf:RDF"]?.item ??
        json?.feed?.entry ??
        [];

      const array = Array.isArray(items)
        ? items
        : [items];

      for (const item of array) {
        if (!item) continue;

        const link = normalizeUrl(item.link);

        if (!link) continue;

        news.push({
          ...item,

          link,

          source: feed.source,

          feedCategory:
            feed.category ?? null,
        });
      }

      console.log(
        `${feed.source}: ${array.length}件取得`
      );
    } catch (error) {
      console.error(
        `${feed.source}: RSS取得エラー`,
        error
      );
    }
  }

  // =========================
  // ORICON NEWS取得
  // =========================

  const oriconNews =
    await fetchOriconNews();

  news.push(...oriconNews);

  // =========================
  // 全体の重複除去
  // =========================

  const uniqueNews = Array.from(
    new Map(
      news.map((item) => [
        normalizeUrl(item.link),
        item,
      ])
    ).values()
  );

  console.log(
    `RSS + ORICON 合計: ${uniqueNews.length}件`
  );

  return uniqueNews;
}