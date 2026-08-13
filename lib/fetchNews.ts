import { XMLParser } from "fast-xml-parser";

const feeds = [
  {
    source: "NHK",
    url: "https://www3.nhk.or.jp/rss/news/cat0.xml",
  },
  {
    source: "ITmedia",
    url: "https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml",
  },
  {
    source: "Impress Watch",
    url: "https://www.watch.impress.co.jp/data/rss/1.0/ipw/feed.rdf",
  },
  {
    source: "GIGAZINE",
    url: "https://gigazine.net/news/rss_2.0/",
  },
  {
    source: "マイナビ芸能",
    url: "https://news.mynavi.jp/rss/entertainment/entertainment/geinou",
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

export async function fetchNews() {
  const news: any[] = [];

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

        news.push({
          ...item,
          link,
          source: feed.source,
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

  console.log(`RSS合計: ${news.length}件`);

  return news;
}