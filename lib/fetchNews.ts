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
];

const parser = new XMLParser({
  ignoreAttributes: false,
});

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
        [];

      const array = Array.isArray(items) ? items : [items];

      for (const item of array) {
        if (!item) continue;

        news.push({
          ...item,
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