import { prisma } from "@/lib/prisma";

export async function handleLineApproval(
  userId: string,
  command: string
) {
  const normalized = command.trim();

  if (normalized !== "良し" && normalized !== "ダメ") {
    return null;
  }

  const inbox = await prisma.lineInboxItem.findFirst({
    where: {
      userId,
      status: "awaiting_approval",
      generatedNewsId: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      generatedNewsId: true,
    },
  });

  if (!inbox?.generatedNewsId) {
    return {
      action: "none" as const,
      message:
        "現在、確認待ちの記事はありません。",
    };
  }

  const news = await prisma.news.findUnique({
    where: {
      id: inbox.generatedNewsId,
    },
    select: {
      id: true,
      title: true,
      publishedAt: true,
    },
  });

  if (!news) {
    await prisma.lineInboxItem.update({
      where: {
        id: inbox.id,
      },
      data: {
        status: "error",
        error: "生成された記事が見つかりません",
      },
    });

    return {
      action: "none" as const,
      message:
        "確認対象の記事が見つかりませんでした。",
    };
  }

  if (normalized === "良し") {
    const publishedAt =
      news.publishedAt ?? new Date();

    await prisma.news.update({
      where: {
        id: news.id,
      },
      data: {
        publishedAt,
      },
    });

    await prisma.lineInboxItem.update({
      where: {
        id: inbox.id,
      },
      data: {
        status: "published",
        error: null,
      },
    });

    return {
      action: "published" as const,
      message:
        `✅ 公開しました。\n\n「${news.title}」`,
      newsId: news.id,
    };
  }

  await prisma.news.delete({
    where: {
      id: news.id,
    },
  });

  await prisma.lineInboxItem.update({
    where: {
      id: inbox.id,
    },
    data: {
      generatedNewsId: null,
      status: "rejected",
      error: null,
    },
  });

  return {
    action: "deleted" as const,
    message:
      `🗑️ 削除しました。\n\n「${news.title}」`,
  };
}
