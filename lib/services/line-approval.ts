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
      message: "現在、確認待ちの記事はありません。",
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
      message: "確認対象の記事が見つかりませんでした。",
    };
  }

  if (normalized === "良し") {
    const publishedAt = news.publishedAt ?? new Date();

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
      message: `✅ 公開しました。\n\n「${news.title}」`,
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
    message: `🗑️ 削除しました。\n\n「${news.title}」`,
  };
}

export async function getRecentPublishedNewsForDeletion(
  userId: string
) {
  return prisma.news.findMany({
    where: {
      publishedAt: {
        not: null,
      },
    },
    orderBy: {
      publishedAt: "desc",
    },
    take: 5,
    select: {
      id: true,
      title: true,
      publishedAt: true,
    },
  });
}

export async function deletePublishedNews(
  newsId: number
) {
  const news = await prisma.news.findUnique({
    where: {
      id: newsId,
    },
    select: {
      id: true,
      title: true,
      publishedAt: true,
    },
  });

  if (!news) {
    return {
      success: false,
      message: "指定した記事が見つかりませんでした。",
    };
  }

  await prisma.news.delete({
    where: {
      id: news.id,
    },
  });

  return {
    success: true,
    message: `✅ 記事を削除しました。\n\n「${news.title}」`,
    newsId: news.id,
    title: news.title,
  };
}

export async function handleLineDeletionCommand(
  userId: string,
  command: string,
  messageId: string
) {
  const normalized = command.trim();

  if (
    normalized !== "消去" &&
    normalized !== "削除" &&
    normalized !== "キャンセル" &&
    !/^[1-5]$/.test(normalized)
  ) {
    return null;
  }

  if (normalized === "消去") {
    const newsList = await prisma.news.findMany({
      where: {
        publishedAt: {
          not: null,
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        title: true,
        publishedAt: true,
      },
    });

    if (newsList.length === 0) {
      return {
        handled: true,
        message: "🗑️ 現在、公開済みの記事はありません。",
      };
    }

    const ids = newsList.map((news) => news.id);

    await prisma.lineInboxItem.upsert({
      where: {
        messageId,
      },
      update: {
        userId,
        type: "text",
        text: command,
        sourceUrl: null,
        imageUrl: null,
        status: "delete_selecting",
        generatedNewsId: null,
        error: JSON.stringify({ ids }),
      },
      create: {
        messageId,
        userId,
        type: "text",
        text: command,
        sourceUrl: null,
        imageUrl: null,
        status: "delete_selecting",
        generatedNewsId: null,
        error: JSON.stringify({ ids }),
      },
    });

    const lines = newsList.map(
      (news, index) =>
        `${index + 1}️⃣ ${news.title}`
    );

    return {
      handled: true,
      message:
        "🗑️ 削除する記事を選択\n\n" +
        lines.join("\n") +
        "\n\n削除したい番号を送ってください。",
    };
  }

  const selectingItem =
    await prisma.lineInboxItem.findFirst({
      where: {
        userId,
        status: {
          in: [
            "delete_selecting",
            "delete_confirming",
          ],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        generatedNewsId: true,
        error: true,
        status: true,
      },
    });

  if (!selectingItem) {
    if (
      normalized === "削除" ||
      normalized === "キャンセル"
    ) {
      return {
        handled: true,
        message:
          normalized === "削除"
            ? "現在、削除確認中の記事はありません。"
            : "現在、キャンセルする削除操作はありません。",
      };
    }

    return {
      handled: true,
      message:
        "先に「消去」と送って、削除する記事を選択してください。",
    };
  }

  if (normalized === "キャンセル") {
    await prisma.lineInboxItem.update({
      where: {
        id: selectingItem.id,
      },
      data: {
        status: "delete_cancelled",
        generatedNewsId: null,
        error: null,
      },
    });

    return {
      handled: true,
      message: "キャンセルしました。",
    };
  }

  if (normalized === "削除") {
    if (
      selectingItem.status !== "delete_confirming" ||
      !selectingItem.generatedNewsId
    ) {
      return {
        handled: true,
        message:
          "削除する記事をまだ選択していません。\n\n「消去」と送ってください。",
      };
    }

    const result = await deletePublishedNews(
      selectingItem.generatedNewsId
    );

    if (!result.success) {
      await prisma.lineInboxItem.update({
        where: {
          id: selectingItem.id,
        },
        data: {
          status: "error",
          generatedNewsId: null,
          error: result.message,
        },
      });

      return {
        handled: true,
        message: result.message,
      };
    }

    await prisma.lineInboxItem.update({
      where: {
        id: selectingItem.id,
      },
      data: {
        status: "deleted",
        generatedNewsId: null,
        error: null,
      },
    });

    return {
      handled: true,
      message: result.message,
    };
  }

  if (selectingItem.status !== "delete_selecting") {
    return {
      handled: true,
      message:
        "現在の記事選択は完了しています。\n\n「削除」で確定するか、「キャンセル」で中止してください。",
    };
  }

  let storedIds: number[] = [];

  try {
    const parsed = selectingItem.error
      ? JSON.parse(selectingItem.error)
      : null;

    if (Array.isArray(parsed?.ids)) {
      storedIds = parsed.ids.filter(
        (id: unknown): id is number =>
          typeof id === "number"
      );
    }
  } catch {
    storedIds = [];
  }

  const index = Number(normalized) - 1;
  const selectedNewsId = storedIds[index];

  if (!selectedNewsId) {
    return {
      handled: true,
      message:
        "選択番号が正しくありません。\n\n1〜5の番号を送ってください。",
    };
  }

  const news = await prisma.news.findUnique({
    where: {
      id: selectedNewsId,
    },
    select: {
      id: true,
      title: true,
      publishedAt: true,
    },
  });

  if (!news || !news.publishedAt) {
    return {
      handled: true,
      message:
        "その記事はすでに存在しないか、公開されていません。\n\nもう一度「消去」と送ってください。",
    };
  }

  await prisma.lineInboxItem.update({
    where: {
      id: selectingItem.id,
    },
    data: {
      status: "delete_confirming",
      generatedNewsId: news.id,
      error: null,
    },
  });

  return {
    handled: true,
    message:
      `⚠️ この記事を削除しますか？\n\n` +
      `「${news.title}」\n\n` +
      `「削除」→ 削除\n` +
      `「キャンセル」→ 中止`,
  };
}
