import { prisma } from "@/lib/prisma";
import { postTweet } from "@/lib/services/x-post";

type LineXSelectionResult =
  | null
  | {
      handled: true;
      kind: "candidate";
      message: string;
      inboxId: number;
      newsId: number;
      title: string;
      selectedIndex: number;
      candidate: string;
    }
  | {
      handled: true;
      kind: "image";
      message: string;
      inboxId: number;
      newsId: number;
      title: string;
      selectedIndex: number;
      candidate: string;
      imageChoice: number;
      waitingForLineImage: boolean;
    };

function parseCandidates(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0
    );
  } catch {
    return [];
  }
}

export async function handleLineXNumericCommand(
  userId: string,
  command: string
): Promise<LineXSelectionResult> {
  if (!/^[1-4]$/.test(command)) {
    return null;
  }

  const pending = await prisma.lineInboxItem.findFirst({
    where: {
      userId,
      xStatus: "pending",
      xCandidates: {
        not: null,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      generatedNewsId: true,
      xCandidates: true,
    },
  });

  if (!pending || !pending.generatedNewsId) {
    return null;
  }

  const candidates = parseCandidates(pending.xCandidates);
  const selectedIndex = Number(command) - 1;
  const candidate = candidates[selectedIndex];

  if (!candidate) {
    return {
      handled: true,
      kind: "candidate",
      message: "X投稿候補は「1」〜「4」から選択してください。",
      inboxId: pending.id,
      newsId: pending.generatedNewsId,
      title: "",
      selectedIndex,
      candidate: "",
    };
  }

  const updated = await prisma.lineInboxItem.updateMany({
    where: {
      id: pending.id,
      xStatus: "pending",
    },
    data: {
      xStatus: "waiting_x_image_choice",
      xSelectedIndex: selectedIndex,
      xImageChoice: null,
      xImageUrl: null,
    },
  });

  if (updated.count !== 1) {
    return {
      handled: true,
      kind: "candidate",
      message: "このX投稿候補はすでに処理中です。少し待ってください。",
      inboxId: pending.id,
      newsId: pending.generatedNewsId,
      title: "",
      selectedIndex,
      candidate,
    };
  }

  const news = await prisma.news.findUnique({
    where: {
      id: pending.generatedNewsId,
    },
    select: {
      title: true,
    },
  });

  return {
    handled: true,
    kind: "image",
    message: "画像を選択してください。",
    inboxId: pending.id,
    newsId: pending.generatedNewsId,
    title: news?.title ?? "",
    selectedIndex,
    candidate,
    imageChoice: 0,
    waitingForLineImage: false,
  };
}

export async function handleLineXImageChoice(
  userId: string,
  command: string
): Promise<LineXSelectionResult> {
  if (!/^[1-3]$/.test(command)) {
    return null;
  }

  const pending = await prisma.lineInboxItem.findFirst({
    where: {
      userId,
      xStatus: "waiting_x_image_choice",
      xCandidates: {
        not: null,
      },
      xSelectedIndex: {
        not: null,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      generatedNewsId: true,
      xCandidates: true,
      xSelectedIndex: true,
    },
  });

  if (!pending || !pending.generatedNewsId) {
    return null;
  }

  const candidates = parseCandidates(pending.xCandidates);
  const selectedIndex = pending.xSelectedIndex ?? -1;
  const candidate = candidates[selectedIndex];

  if (!candidate) {
    return null;
  }

  const imageChoice = Number(command);

  const news = await prisma.news.findUnique({
    where: {
      id: pending.generatedNewsId,
    },
    select: {
      title: true,
    },
  });

  // 1 = 記事画像 → そのまま投稿
  if (imageChoice === 1) {
    await prisma.lineInboxItem.update({
      where: {
        id: pending.id,
      },
      data: {
        xImageChoice: 1,
        xImageUrl: null,
        xStatus: "posting",
      },
    });

    return {
      handled: true,
      kind: "image",
      message: "画像選択完了",
      inboxId: pending.id,
      newsId: pending.generatedNewsId,
      title: news?.title ?? "",
      selectedIndex,
      candidate,
      imageChoice: 1,
      waitingForLineImage: false,
    };
  }

  // 2 / 3 = 新しいLINE画像を待つ
  await prisma.lineInboxItem.update({
    where: {
      id: pending.id,
    },
    data: {
      xImageChoice: imageChoice,
      xImageUrl: null,
      xStatus: "waiting_x_image",
    },
  });

  return {
    handled: true,
    kind: "image",
    message: "LINE画像を送ってください。",
    inboxId: pending.id,
    newsId: pending.generatedNewsId,
    title: news?.title ?? "",
    selectedIndex,
    candidate,
    imageChoice,
    waitingForLineImage: true,
  };
}

export async function attachLineXImageAndPost(params: {
  inboxId: number;
  imageUrl: string;
}) {
  const pending = await prisma.lineInboxItem.findUnique({
    where: {
      id: params.inboxId,
    },
    select: {
      id: true,
      generatedNewsId: true,
      xCandidates: true,
      xSelectedIndex: true,
      xImageChoice: true,
      xStatus: true,
    },
  });

  if (
    !pending ||
    pending.xStatus !== "waiting_x_image" ||
    !pending.generatedNewsId ||
    !pending.xImageChoice ||
    ![2, 3].includes(pending.xImageChoice)
  ) {
    return null;
  }

  const candidates = parseCandidates(pending.xCandidates);
  const selectedIndex = pending.xSelectedIndex ?? -1;
  const candidate = candidates[selectedIndex];

  if (!candidate) {
    return null;
  }

  await prisma.lineInboxItem.update({
    where: {
      id: pending.id,
    },
    data: {
      xImageUrl: params.imageUrl,
      xStatus: "posting",
    },
  });

  return executeLineXPost({
    inboxId: pending.id,
    newsId: pending.generatedNewsId,
    candidate,
    imageChoice: pending.xImageChoice,
  });
}

export async function executeLineXPost(params: {
  inboxId: number;
  newsId: number;
  candidate: string;
  imageChoice: number;
}) {
  const item = await prisma.lineInboxItem.findUnique({
    where: {
      id: params.inboxId,
    },
    select: {
      id: true,
      xStatus: true,
      xSelectedIndex: true,
      xImageUrl: true,
      xImageChoice: true,
      generatedNewsId: true,
    },
  });

  if (!item || item.xStatus !== "posting") {
    return null;
  }

  const news = await prisma.news.findUnique({
    where: {
      id: params.newsId,
    },
    select: {
      id: true,
      title: true,
      image: true,
    },
  });

  if (!news) {
    throw new Error("記事が見つかりません");
  }

  const imageUrls =
    params.imageChoice === 1
      ? news.image
        ? [news.image]
        : []
      : params.imageChoice === 2
        ? item.xImageUrl
          ? [item.xImageUrl]
          : []
        : [
            ...(news.image ? [news.image] : []),
            ...(item.xImageUrl ? [item.xImageUrl] : []),
          ];

  if (imageUrls.length === 0) {
    throw new Error("投稿する画像がありません");
  }

  const result = await postTweet(params.candidate, imageUrls);

  await prisma.news.update({
    where: {
      id: news.id,
    },
    data: {
      xPostUrl: result.url,
    },
  });

  await prisma.lineInboxItem.update({
    where: {
      id: item.id,
    },
    data: {
      xStatus: "posted",
      xPostedAt: new Date(),
      xPostedText: result.text,
      xPostId: result.id,
      error: null,
    },
  });

  return {
    ...result,
    title: news.title,
  };
}

export async function markLineXPostError(
  inboxId: number,
  error: unknown
) {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  await prisma.lineInboxItem.update({
    where: {
      id: inboxId,
    },
    data: {
      xStatus: "error",
      error: message,
    },
  });

  return message;
}
