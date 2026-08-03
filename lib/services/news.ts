import { prisma } from "@/lib/prisma";
import { fetchNews } from "@/lib/fetchNews";
import {
  generateSummary,
  generateCategory,
  generateScore,
} from "@/lib/ai";
import { getImage } from "@/lib/getImage";

export async function syncNews() {
  const items = await fetchNews();

  let added = 0;
  let updated = 0;

  for (const item of items) {
    const title = item.title ?? "";
    const sourceUrl = item.link ?? "";

    if (!title || !sourceUrl) continue;

    const exists = await prisma.news.findUnique({
      where: {
        sourceUrl,
      },
    });

    // 既存記事なら不足データを補完
if (exists) {
  const image =
    exists.image ?? (await getImage(sourceUrl));

  const summary =
    exists.summary || (await generateSummary(title));

  const category =
    exists.category || (await generateCategory(title));

  const score =
    exists.score === 50
      ? await generateScore(title)
      : exists.score;

  await prisma.news.update({
    where: {
      sourceUrl,
    },
    data: {
      image,
      summary,
      category,
      score,
    },
  });

  updated++;
  console.log("更新:", title);

  continue;
}

    const summary = await generateSummary(title);
    const category = await generateCategory(title);
    const image = await getImage(sourceUrl);

    await prisma.news.create({
      data: {
        title,
        summary,
        category,
        score: await generateScore(title),
        image,
        source: item.source ?? "RSS",
        sourceUrl,
        publishedAt: item.pubDate
          ? new Date(item.pubDate)
          : null,
      },
    });

    added++;
    console.log("追加:", title);
  }

  return {
    success: true,
    added,
    updated,
    total: items.length,
  };
}