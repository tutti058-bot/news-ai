import { NextResponse } from "next/server";
import crypto from "crypto";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

function verifySignature(
  body: string,
  signature: string | null
) {
  const secret = process.env.LINE_CHANNEL_SECRET;

  if (!secret || !signature) {
    return false;
  }

  const hash = crypto
    .createHmac("SHA256", secret)
    .update(body)
    .digest("base64");

  const expected = Buffer.from(hash);
  const actual = Buffer.from(signature);

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
}

function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

async function downloadLineContent(messageId: string) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error(
      "LINE_CHANNEL_ACCESS_TOKEN が設定されていません"
    );
  }

  const response = await fetch(
    `https://api-data.line.me/v2/bot/message/${encodeURIComponent(messageId)}/content`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `LINE画像取得失敗: ${response.status} ${errorText}`
    );
  }

  const contentType =
    response.headers.get("content-type") ??
    "application/octet-stream";

  const arrayBuffer = await response.arrayBuffer();

  return {
    contentType,
    buffer: Buffer.from(arrayBuffer),
  };
}

function extensionFromContentType(contentType: string) {
  const normalized = contentType.toLowerCase();

  if (normalized.includes("jpeg")) return "jpg";
  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("gif")) return "gif";
  if (normalized.includes("heic")) return "heic";
  if (normalized.includes("mp4")) return "mp4";
  if (normalized.includes("quicktime")) return "mov";

  return "bin";
}

async function saveLineContent(
  messageId: string,
  contentType: string,
  buffer: Buffer
) {
  const extension =
    extensionFromContentType(contentType);

  const fileName =
    `line-inbox/${Date.now()}-${messageId}.${extension}`;

  const blob = await put(fileName, buffer, {
    access: "public",
    contentType,
  });

  return blob.url;
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature =
      request.headers.get("x-line-signature");

    if (!verifySignature(body, signature)) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const data = JSON.parse(body);

    console.log(
      "LINE Webhook受信:",
      JSON.stringify(data, null, 2)
    );

    for (const event of data.events ?? []) {
      if (event.type !== "message") {
        continue;
      }

      const message = event.message;

      if (!message?.id) {
        continue;
      }

      const type = message.type ?? "unknown";
      const userId =
        event.source?.userId ?? null;
      const webhookEventId =
        event.webhookEventId ?? null;

      let text: string | null = null;
      let sourceUrl: string | null = null;
      let imageUrl: string | null = null;

      if (type === "text") {
        text = message.text ?? null;

        if (text) {
          sourceUrl = extractUrl(text);
        }

        console.log(
          "LINEテキスト:",
          text
        );
      }

      if (type === "image") {
        console.log(
          "LINE画像受信:",
          message.id
        );

        try {
          const content =
            await downloadLineContent(
              message.id
            );

          imageUrl =
            await saveLineContent(
              message.id,
              content.contentType,
              content.buffer
            );

          console.log(
            "LINE画像保存完了:",
            imageUrl
          );
        } catch (error) {
          console.error(
            "LINE画像保存エラー:",
            message.id,
            error
          );

          await prisma.lineInboxItem.upsert({
            where: {
              messageId: message.id,
            },
            update: {
              webhookEventId,
              userId,
              type,
              text,
              sourceUrl,
              imageUrl: null,
              status: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "LINE画像保存に失敗しました",
            },
            create: {
              messageId: message.id,
              webhookEventId,
              userId,
              type,
              text,
              sourceUrl,
              imageUrl: null,
              status: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "LINE画像保存に失敗しました",
            },
          });

          continue;
        }
      }

      await prisma.lineInboxItem.upsert({
        where: {
          messageId: message.id,
        },
        update: {
          webhookEventId,
          userId,
          type,
          text,
          sourceUrl,
          imageUrl,
          status: "pending",
          error: null,
        },
        create: {
          messageId: message.id,
          webhookEventId,
          userId,
          type,
          text,
          sourceUrl,
          imageUrl,
          status: "pending",
        },
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "LINE Webhookエラー:",
      error
    );

    return NextResponse.json(
      {
        error: "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    service:
      "AI NEWSジャパン LINE Webhook",
  });
}
