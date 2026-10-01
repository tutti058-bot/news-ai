import { prisma } from "@/lib/prisma";
import {
  generateXImageBase64,
} from "@/lib/services/x-image";
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
      kind: "posting";
      inboxId: number;
      newsId: number;
      title: string;
      selectedIndex: number;
      candidate: string;
      imageChoice: number;
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

  /*
   * 画像選択待ちを最優先。
   * ここでは「1〜2」が画像選択、
   * 「3〜4」は不正入力として処理する。
   */
  const imageSelecting = await prisma.lineInboxItem.findFirst({
    where: {
      userId,
      xStatus: "image_selecting",
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

  if (imageSelecting) {
    const candidates = parseCandidates(
      imageSelecting.xCandidates
    );

    if (
      !imageSelecting.generatedNewsId ||
      imageSelecting.xSelectedIndex === null ||
      !candidates[imageSelecting.xSelectedIndex]
    ) {
      return {
        handled: true,
        kind: "candidate",
        message:
          "X投稿候補の状態を取得できませんでした。もう一度「良し」からやり直してください。",
        inboxId: imageSelecting.id,
        newsId: 0,
        title: "",
        selectedIndex: 0,
        candidate: "",
      };
    }

    if (command !== "1" && command !== "2") {
      return {
        handled: true,
        kind: "candidate",
        message:
          "画像は「1」か「2」を選択してください。",
        inboxId: imageSelecting.id,
        newsId: 0,
        title: "",
        selectedIndex: 0,
        candidate: "",
      };
    }

    const updated = await prisma.lineInboxItem.updateMany({
      where: {
        id: imageSelecting.id,
        xStatus: "image_selecting",
      },
      data: {
        xStatus: "posting",
      },
    });

    if (updated.count !== 1) {
      return {
        handled: true,
        kind: "candidate",
        message:
          "このX投稿はすでに処理中です。少し待ってください。",
        inboxId: imageSelecting.id,
        newsId: imageSelecting.generatedNewsId,
        title: "",
        selectedIndex: imageSelecting.xSelectedIndex,
        candidate: candidates[imageSelecting.xSelectedIndex],
      };
    }

    const news = await prisma.news.findUnique({
      where: {
        id: imageSelecting.generatedNewsId,
      },
      select: {
        title: true,
      },
    });

    return {
      handled: true,
      kind: "posting",
      inboxId: imageSelecting.id,
      newsId: imageSelecting.generatedNewsId,
      title: news?.title ?? "",
      selectedIndex: imageSelecting.xSelectedIndex,
      candidate: candidates[imageSelecting.xSelectedIndex],
      imageChoice: Number(command),
    };
  }

  /*
   * 候補選択待ち。
   */
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
    /*
     * X候補生成中なら、数字を削除操作として誤解させない。
     */
    const generating = await prisma.lineInboxItem.findFirst({
      where: {
        userId,
        xStatus: "generating",
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
      },
    });

    if (generating) {
      return {
        handled: true,
        kind: "candidate",
        message:
          "⏳ X投稿候補を生成中です。もう少し待ってください。",
        inboxId: generating.id,
        newsId: 0,
        title: "",
        selectedIndex: 0,
        candidate: "",
      };
    }

    return null;
  }

  const candidates = parseCandidates(
    pending.xCandidates
  );

  const selectedIndex = Number(command) - 1;
  const candidate = candidates[selectedIndex];

  if (!candidate) {
    return {
      handled: true,
      kind: "candidate",
      message:
        "X投稿候補は「1」〜「4」から選択してください。",
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
      xStatus: "image_selecting",
      xSelectedIndex: selectedIndex,
    },
  });

  if (updated.count !== 1) {
    return {
      handled: true,
      kind: "candidate",
      message:
        "このX投稿候補はすでに処理中です。少し待ってください。",
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
    kind: "candidate",
    message:
      "候補を選択しました。\n\n" +
      "次にXへ投稿する画像を選択してください。",
    inboxId: pending.id,
    newsId: pending.generatedNewsId,
    title: news?.title ?? "",
    selectedIndex,
    candidate,
  };
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

  let image: string | undefined;

  if (params.imageChoice === 1) {
    if (!news.image) {
      throw new Error(
        "記事に既存画像がありません。"
      );
    }

    image = news.image;
  } else if (params.imageChoice === 2) {
    const generated =
      await generateXImageBase64(
        news.id,
        "yani_reaction"
      );

    image =
      `data:${generated.mimeType};base64,${generated.base64}`;
  } else {
    throw new Error(
      "画像選択は1または2です"
    );
  }

  const result = await postTweet(
    params.candidate,
    image,
    "image/png"
  );

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
