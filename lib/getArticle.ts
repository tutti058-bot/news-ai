import { extract } from "@extractus/article-extractor";
import * as cheerio from "cheerio";

export async function getArticle(url: string) {
  try {
    /*
     * ========================================
     * ① article-extractor
     * ========================================
     */

    try {
      const article = await extract(url);

      if (article?.content) {
        const text = article.content
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 5000);

        if (text.length >= 300) {
          console.log(
            "article-extractor取得成功:",
            url
          );

          return text;
        }
      }
    } catch (error) {
      console.error(
        "article-extractor error:",
        error
      );
    }

    /*
     * ========================================
     * ② 通常fetch
     * ========================================
     */

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 10000);

    let res: Response;

    try {
      res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Safari/537.36",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language":
            "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        redirect: "follow",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      console.log(
        "HTTPエラー:",
        res.status,
        url
      );

      return "";
    }

    /*
     * ========================================
     * ③ HTML取得
     * ========================================
     */

    const html = await res.text();

    const $ = cheerio.load(html);

    let text = "";

    /*
     * ========================================
     * ④ NHK
     * ========================================
     */

    if (
      url.includes("nhk.or.jp") ||
      url.includes("www3.nhk.or.jp")
    ) {
      text =
        $(".content--body").text() ||
        $(".article-body").text() ||
        $("article").text();
    }

    /*
     * ========================================
     * ⑤ ITmedia
     * ========================================
     */

    if (url.includes("itmedia.co.jp")) {
      text =
        $(".article_body").text() ||
        $(".article-body").text() ||
        $("article").text();
    }

    /*
     * ========================================
     * ⑥ Impress Watch
     * ========================================
     */

    if (
      url.includes("watch.impress.co.jp")
    ) {
      text =
        $(".article-body").text() ||
        $(".articleBody").text() ||
        $("article").text();
    }

    /*
     * ========================================
     * ⑦ GIGAZINE
     * ========================================
     */

    if (url.includes("gigazine.net")) {
      text =
        $(".entry-content").text() ||
        $(".post").text() ||
        $("article").text();
    }

    /*
     * ========================================
     * ⑧ ORICON NEWS
     * ========================================
     */

    if (
      url.includes("oricon.co.jp")
    ) {
      text =
        $("article").text() ||
        $(".article-body").text() ||
        $(".articleBody").text() ||
        $(".news-article").text() ||
        $(".contents").text();
    }

    /*
     * ========================================
     * ⑨ マイナビニュース系
     * ========================================
     */

    if (
      url.includes("news.mynavi.jp") ||
      url.includes("beauty.mynavi.jp")
    ) {
      text =
        $("article").text() ||
        $(".article-body").text() ||
        $(".articleBody").text();
    }

    /*
     * ========================================
     * ⑩ 汎用article
     * ========================================
     */

    if (!text) {
      text =
        $("article").text();
    }

    /*
     * ========================================
     * ⑪ main
     * ========================================
     */

    if (!text) {
      text =
        $("main").text();
    }

    /*
     * ========================================
     * ⑫ body
     * ========================================
     */

    if (!text) {
      text =
        $("body").text();
    }

    /*
     * ========================================
     * ⑬ テキスト整形
     * ========================================
     */

    text = text
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);

    console.log(
      "本文取得文字数:",
      text.length,
      url
    );

    return text;

  } catch (error) {
    console.error(
      "getArticle error:",
      url,
      error
    );

    return "";
  }
}