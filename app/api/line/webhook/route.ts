import { NextResponse } from "next/server";
import crypto from "crypto";
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

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-line-signature");

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
      if (event.type !== "message") continue;

      const message = event.message;

      if (!message?.id) continue;

      const type = message.type ?? "unknown";
      const userId = event.source?.userId ?? null;
      const webhookEventId = event.webhookEventId ?? null;

      let text: string | null = null;
      let sourceUrl: string | null = null;
      let imageUrl: string | null = null;

      if (type === "text") {
        text = message.text ?? null;

        if (text) {
          sourceUrl = extractUrl(text);
        }

        console.log("LINEテキスト:", text);
      }

      if (type === "image") {
        imageUrl = message.id;
        console.log("LINE画像受信:", message.id);
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
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "AI NEWSジャパン LINE Webhook",
  });
}
