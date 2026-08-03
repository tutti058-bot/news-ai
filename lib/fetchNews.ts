import { XMLParser } from "fast-xml-parser";

export async function fetchNews() {
  const res = await fetch(
    "https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja",
    {
      next: {
        revalidate: 1800,
      },
    }
  );

  if (!res.ok) {
    throw new Error("RSS取得失敗");
  }

  const xml = await res.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
  });

  const json = parser.parse(xml);

  return json.rss.channel.item;
}