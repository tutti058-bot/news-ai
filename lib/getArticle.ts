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
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 10000);

      let article: Awaited<ReturnType<typeof extract>>;

      try {
        article = await Promise.race([
          extract(url),
          new Promise<Awaited<ReturnType<typeof extract>>>((_, reject) =>
            setTimeout(
              () => reject(new Error("article-extractor timeout")),
              10000
            )
          ),
        ]);
      } finally {
        clearTimeout(timeout);
      }

      if (article?.content) {
        const text = article.content
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 5000);

        const looksLikeCode =
          /window\.|wiz_progress|wiz_tick|<script|javascript:|function\s*\(/.test(
            text
          );

        if (text.length >= 300 && !looksLikeCode) {
          console.log(
            "article-extractor取得成功:",
            url
          );

          return text;
        }

        if (looksLikeCode) {
          console.log(
            "article-extractor本文がコードのため破棄:",
            url
          );
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

    const fetchedTextLooksLikeCode =
      /window\.|wiz_progress|wiz_tick|<script|javascript:|function\s*\(/.test(
        text
      );

    if (text.length < 300 || fetchedTextLooksLikeCode) {
      console.log(
        "通常fetch本文が不正または不自然なため破棄:",
        url
      );

      return "";
    }

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
export async function getArticleImage(url: string): Promise<string | null> {
  try {
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
      console.log("画像元HTML取得失敗:", res.status, url);
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const resolveImageUrl = (imageUrl: string | undefined): string | null => {
      if (!imageUrl) return null;

      const trimmed = imageUrl.trim();

      if (!trimmed || trimmed.startsWith("data:")) {
        return null;
      }

      try {
        return new URL(trimmed, res.url || url).toString();
      } catch {
        return null;
      }
    };

    // ① OGP画像
    const ogImage =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[property="og:image:url"]').attr("content");

    const resolvedOgImage = resolveImageUrl(ogImage);

    if (resolvedOgImage) {
      console.log("OGP画像取得成功:", resolvedOgImage);
      return resolvedOgImage;
    }

    // ② Twitter Card画像
    const twitterImage =
      $('meta[name="twitter:image"]').attr("content") ||
      $('meta[name="twitter:image:src"]').attr("content");

    const resolvedTwitterImage = resolveImageUrl(twitterImage);

    if (resolvedTwitterImage) {
      console.log("Twitter画像取得成功:", resolvedTwitterImage);
      return resolvedTwitterImage;
    }

    // ③ article内の画像
    let articleImage: string | null = null;

    $("article img").each((_, el) => {
      if (articleImage) return;

      const src =
        $(el).attr("src") ||
        $(el).attr("data-src") ||
        $(el).attr("data-lazy-src");

      const resolved = resolveImageUrl(src);

      if (resolved) {
        articleImage = resolved;
      }
    });

    if (articleImage) {
      console.log("article画像取得成功:", articleImage);
      return articleImage;
    }

    // ④ main内の画像
    let mainImage: string | null = null;

    $("main img").each((_, el) => {
      if (mainImage) return;

      const src =
        $(el).attr("src") ||
        $(el).attr("data-src") ||
        $(el).attr("data-lazy-src");

      const resolved = resolveImageUrl(src);

      if (resolved) {
        mainImage = resolved;
      }
    });

    if (mainImage) {
      console.log("main画像取得成功:", mainImage);
      return mainImage;
    }

    console.log("元記事画像が見つかりませんでした:", url);
    return null;
  } catch (error) {
    console.error("getArticleImage error:", url, error);
    return null;
  }
}
