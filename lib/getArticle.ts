import { extract } from "@extractus/article-extractor";
import * as cheerio from "cheerio";

export async function getArticle(url: string) {
  try {
    // まず article-extractor を試す
    const article = await extract(url);

    if (article?.content) {
      return article.content
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 5000);
    }

    // 取得できなかったら従来の方法
    const res = await fetch(url);

    if (!res.ok) return "";

    const html = await res.text();

    const $ = cheerio.load(html);

    let text = "";

    if (url.includes("nhk.or.jp")) {
      text = $(".content--body").text();
    }

    if (url.includes("itmedia.co.jp")) {
      text = $(".article_body").text();
    }

    if (url.includes("watch.impress.co.jp")) {
      text =
        $(".article-body").text() ||
        $(".articleBody").text();
    }

    if (url.includes("gigazine.net")) {
      text =
        $(".entry-content").text() ||
        $(".post").text();
    }

    if (!text) {
      text = $("article").text();
    }

    if (!text) {
      text = $("body").text();
    }

    return text
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);
  } catch (error) {
    console.error(error);
    return "";
  }
}