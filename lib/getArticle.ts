import * as cheerio from "cheerio";

export async function getArticle(url: string) {
  try {
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

if (!text) {
  text = $("article").text();
}

if (url.includes("watch.impress.co.jp")) {
  text =
    $(".article-body").text() ||
    $(".articleBody").text();
}

if (url.includes("gigazine.net")) {
  text =
    $(".entry-content").text() ||
    $(".post").text() ||
    $(".cntimage + p").parent().text();
}

if (!text) {
  text = $("body").text();
}

    return text
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);
  } catch {
    return "";
  }
}