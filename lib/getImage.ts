import * as cheerio from "cheerio";

export async function getImage(url: string) {
  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 5000);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/138.0 Safari/537.36",
    },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    /*
     * =========================
     * ゲキサカ
     * =========================
     *
     * ゲキサカは og:image が
     * dummy_300.gif になることがある。
     *
     * 実画像は data-original に
     * 入っているため、こちらを優先する。
     */

    if (url.includes("gekisaka.jp")) {
      const gekisakaImage =
        $('img[data-original]')
          .map((_, el) => $(el).attr("data-original"))
          .get()
          .find((src) => {
            if (!src) return false;

            return (
              !src.includes("dummy") &&
              !src.includes("spacer") &&
              !src.includes("logo") &&
              !src.includes("no_bookmark") &&
              !src.includes("spike")
            );
          });

      if (gekisakaImage) {
        if (gekisakaImage.startsWith("//")) {
          return "https:" + gekisakaImage;
        }

        if (gekisakaImage.startsWith("/")) {
          const base = new URL(url);
          return base.origin + gekisakaImage;
        }

        return gekisakaImage;
      }
    }

    /*
     * =========================
     * 通常サイト
     * =========================
     */

    const image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[property="og:image:url"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('meta[name="twitter:image:src"]').attr("content") ||
      $('link[rel="image_src"]').attr("href") ||
      $('meta[itemprop="image"]').attr("content") ||
      $('article img').first().attr("src") ||
      $("img").first().attr("src");

    if (!image) return null;

    /*
     * dummy画像は無効
     */

    if (
      image.includes("dummy") ||
      image.includes("spacer") ||
      image.includes("spike")
    ) {
      return null;
    }

    if (image.startsWith("//")) {
      return "https:" + image;
    }

    if (image.startsWith("/")) {
      const base = new URL(url);
      return base.origin + image;
    }

    return image;
  } catch {
    return null;
  }
}