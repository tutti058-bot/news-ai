const LINE_REPLY_URL =
  "https://api.line.me/v2/bot/message/reply";

const LINE_PUSH_URL =
  "https://api.line.me/v2/bot/message/push";

function getAccessToken() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      "LINE_CHANNEL_ACCESS_TOKEN が設定されていません"
    );
  }

  return token;
}

async function lineRequest(
  url: string,
  body: unknown
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");

    throw new Error(
      `LINE API送信失敗: ${response.status} ${errorText}`
    );
  }

  return response;
}

export async function replyLineMessage(
  replyToken: string,
  messages: unknown[]
) {
  return lineRequest(LINE_REPLY_URL, {
    replyToken,
    messages,
  });
}

export async function pushLineMessage(
  userId: string,
  messages: unknown[]
) {
  return lineRequest(LINE_PUSH_URL, {
    to: userId,
    messages,
  });
}

export function createApprovalMessages(params: {
  title: string;
  article: string;
  summary: string | null;
  supplement: string | null;
  image: string | null;
}) {
  const messages: unknown[] = [];
  const summary = params.summary?.trim() || "要約なし";
  const supplement = params.supplement?.trim() || "";

  const text = [
    "AI NEWSジャパン",
    "記事生成が完了しました",
    "",
    params.title.trim(),
    "",
    summary,
    ...(supplement ? ["", supplement] : []),
    "",
    "――――――――――",
    "この内容で公開しますか？",
    "",
    "「良し」→ 公開",
    "「ダメ」→ 削除",
  ].join("\n");

  messages.push({
    type: "text",
    text,
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "message",
            label: "良し",
            text: "良し",
          },
        },
        {
          type: "action",
          action: {
            type: "message",
            label: "ダメ",
            text: "ダメ",
          },
        },
      ],
    },
  });

  if (params.image) {
    messages.push({
      type: "image",
      originalContentUrl: params.image,
      previewImageUrl: params.image,
    });
  }

  return messages;
}

export function createXCandidateMessages(params: {
  title: string;
  candidates: string[];
}) {
  const candidateLines = params.candidates
    .slice(0, 4)
    .map((candidate, index) => `${index + 1}. ${candidate}`)
    .join("\n\n");

  return [
    {
      type: "text",
      text: [
        "X投稿候補を作成しました",
        "",
        `「${params.title.trim()}」`,
        "",
        candidateLines,
        "",
        "投稿する候補の番号を選択してください。",
      ].join("\n"),
      quickReply: {
        items: [1, 2, 3, 4].map((number) => ({
          type: "action",
          action: {
            type: "message",
            label: String(number),
            text: String(number),
          },
        })),
      },
    },
  ];
}

export function createXImageChoiceMessages() {
  const choices = [
    "1. 記事の画像",
    "2. LINE画像を送る",
    "3. 記事の画像＋LINE画像",
  ];

  return [{
    type: "text",
    text: [
      "X投稿画像を選択してください",
      "",
      ...choices,
    ].join("\n"),
    quickReply: {
      items: [1, 2, 3].map((number) => ({
        type: "action",
        action: {
          type: "message",
          label: String(number),
          text: String(number),
        },
      })),
    },
  }];
}

export function createXPostingMessage(imageChoice: number) {
  const imageLabel =
    imageChoice === 1
      ? "記事の画像"
      : imageChoice === 2
        ? "LINEで送った画像"
        : "記事の画像＋LINE画像";

  return [
    {
      type: "text",
      text:
        "⏳ Xへの投稿を処理しています。\n\n" +
        `画像：${imageLabel}`,
    },
  ];
}

export function createXPostedMessage(params: {
  text: string;
  url: string;
  imageChoice: number;
}) {
  const imageLabel =
    params.imageChoice === 1
      ? "記事の画像"
      : params.imageChoice === 2
        ? "LINEで送った画像"
        : "記事の画像＋LINE画像";

  return [
    {
      type: "text",
      text: [
        "✅ Xに投稿しました。",
        "",
        params.text,
        "",
        `画像：${imageLabel}`,
        "",
        params.url,
      ].join("\n"),
    },
  ];
}

export function createXPostErrorMessage(message: string) {
  return [
    {
      type: "text",
      text:
        "❌ Xへの投稿に失敗しました。\n\n" +
        message,
    },
  ];
}

export function createProcessingMessage() {
  return [
    {
      type: "text",
      text:
        "📥 受け付けました。\n\n" +
        "AI NEWSジャパンで記事と画像を生成しています。\n" +
        "完成したらこのLINEに送ります。",
    },
  ];
}
