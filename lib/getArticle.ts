import * as cheerio from "cheerio";

export async function getArticle(url: string) {
  try {
    const res = await fetch(url);

    if (!res.ok) return "";

    const html = await res.text();

    const $ = cheerio.load(html);

    const text = $("article").text() || $("body").text();

    return text
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);
  } catch {
    return "";
  }
}