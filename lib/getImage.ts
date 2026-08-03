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