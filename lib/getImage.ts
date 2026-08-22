import * as cheerio from "cheerio";

function normalizeImageUrl(image: string, pageUrl: string): string | null {
  if (!image) return null;

  let value = image.trim();

  if (!value) return null;

  // HTML entity
  value = value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");

  // protocol-relative
  if (value.startsWith("//")) {
    value = "https:" + value;
  }

  // relative URL
  try {
    value = new URL(value, pageUrl).href;
  } catch {
    return null;
  }

  return value;
}

/**
 * 明らかに記事画像ではない画像を除外
 */
function isInvalidImage(image: string): boolean {
  const lower = image.toLowerCase();

  const invalidPatterns = [
    // ゲキサカのダミー・共通画像
    "dummy_300.gif",
    "spike.png",
    "logo-gekisaka",
    "no_bookmark",
    "spacer.gif",

    // ゲキサカの大会・カテゴリ共通画像
    "/data/image/convention/",

    // よくあるサイト共通素材
    "/logo.",
    "/logo_",
    "/icon.",
    "/icon_",
    "/favicon",
    "sprite",
    "banner",
    "loading",
    "placeholder",
    "noimage",
    "no-image",
    "not-found",
  ];

  return invalidPatterns.some((pattern) => lower.includes(pattern));
}

/**
 * ゲキサカの記事画像として優先する画像か
 */
function isGekisakaArticleImage(image: string): boolean {
  const lower = image.toLowerCase();

  if (isInvalidImage(image)) {
    return false;
  }

  // ゲキサカ画像サーバー以外は通常の画像候補として許可
  if (!lower.includes("f.image.geki.jp")) {
    return true;
  }

  /*
   * ゲキサカの共通画像を除外。
   *
   * 現在確認できている共通画像：
   * /data/image/convention/
   *
   * 記事固有画像は data/image 配下でも
   * convention 以外に存在するため、
   * ここでは convention だけを明確に除外する。
   */
  return !lower.includes("/data/image/convention/");
}

export async function getImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 8000);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Safari/537.36",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const isGekisaka =
      new URL(url).hostname === "web.gekisaka.jp" ||
      new URL(url).hostname.endsWith(".gekisaka.jp");

    /*
     * =========================================================
     * 1. OG IMAGE
     * =========================================================
     */

    const ogCandidates = [
      $('meta[property="og:image"]').attr("content"),
      $('meta[property="og:image:url"]').attr("content"),
      $('meta[name="twitter:image"]').attr("content"),
      $('meta[name="twitter:image:src"]').attr("content"),
      $('link[rel="image_src"]').attr("href"),
      $('meta[itemprop="image"]').attr("content"),
    ];

    for (const candidate of ogCandidates) {
      if (!candidate) continue;

      const image = normalizeImageUrl(candidate, url);

      if (!image) continue;
      if (isInvalidImage(image)) continue;

      /*
       * ゲキサカは og:image が dummy_300.gif の場合がある。
       * その場合は下の本文画像探索へ進む。
       */
      if (isGekisaka && !isGekisakaArticleImage(image)) {
        continue;
      }

      return image;
    }

    /*
     * =========================================================
     * 2. ゲキサカ専用
     * =========================================================
     *
     * ゲキサカは lazy-load の画像を
     *
     * data-original
     * data-src
     * src
     *
     * などで持っている。
     *
     * ただしページ全体を検索すると大会共通画像も大量に拾うため、
     * 記事本文に近い領域を優先する。
     */

    if (isGekisaka) {
      const candidates: string[] = [];

      const selectors = [
        // 記事本文周辺
        "article img",
        ".article img",
        ".news-detail img",
        ".news-detail__body img",
        ".article-body img",
        ".news-body img",

        // ゲキサカで使われる可能性のある本文系
        "[class*='article'] img",
        "[class*='news'] img",
        "[class*='detail'] img",
      ];

      for (const selector of selectors) {
        $(selector).each((_, el) => {
          const $img = $(el);

          const attrs = [
            $img.attr("data-original"),
            $img.attr("data-src"),
            $img.attr("data-lazy-src"),
            $img.attr("src"),
          ];

          for (const value of attrs) {
            if (value) {
              candidates.push(value);
            }
          }
        });
      }

      /*
       * セレクタで見つからなかった場合は、
       * data-original / data-src 全体から探す。
       */
      if (candidates.length === 0) {
        $("img").each((_, el) => {
          const $img = $(el);

          const attrs = [
            $img.attr("data-original"),
            $img.attr("data-src"),
            $img.attr("data-lazy-src"),
            $img.attr("src"),
          ];

          for (const value of attrs) {
            if (value) {
              candidates.push(value);
            }
          }
        });
      }

      for (const candidate of candidates) {
        const image = normalizeImageUrl(candidate, url);

        if (!image) continue;
        if (!isGekisakaArticleImage(image)) continue;

        /*
         * ゲキサカの画像サーバーにある画像だけでなく、
         * 外部CDN等も候補として許可。
         */
        return image;
      }

      /*
       * ゲキサカで記事固有画像を確認できなかった場合、
       * 共通画像を無理やり返さない。
       */
      return null;
    }

    /*
     * =========================================================
     * 3. その他サイト
     * =========================================================
     */

    const generalCandidates: string[] = [];

    $("article img").each((_, el) => {
      const $img = $(el);

      const attrs = [
        $img.attr("data-original"),
        $img.attr("data-src"),
        $img.attr("data-lazy-src"),
        $img.attr("src"),
      ];

      for (const value of attrs) {
        if (value) {
          generalCandidates.push(value);
        }
      }
    });

    $("img").each((_, el) => {
      const $img = $(el);

      const attrs = [
        $img.attr("data-original"),
        $img.attr("data-src"),
        $img.attr("data-lazy-src"),
        $img.attr("src"),
      ];

      for (const value of attrs) {
        if (value) {
          generalCandidates.push(value);
        }
      }
    });

    for (const candidate of generalCandidates) {
      const image = normalizeImageUrl(candidate, url);

      if (!image) continue;
      if (isInvalidImage(image)) continue;

      return image;
    }

    return null;
  } catch {
    return null;
  }
}
