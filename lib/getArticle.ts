import { extract } from "@extractus/article-extractor";
import * as cheerio from "cheerio";

export async function getArticle(url: string) {
  try {
    // まず article-extractor を試す
    try {
      const article = await extract(url);

      if (article?.content) {
        return article.content
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 5000);
      }
    } catch (error) {
      console.error("article-extractor error:", error);
    }

    // article-extractorで取得できなかった場合
    // fetchには10秒のタイムアウトを設定
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 10000);

    let res: Response;

    try {
      res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/138.0 Safari/537.36",
        },
        redirect: "follow",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

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
    console.error("getArticle error:", error);
    return "";
  }
}
