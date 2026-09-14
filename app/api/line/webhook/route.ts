import { NextResponse } from "next/server";
import crypto from "crypto";

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

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(signature)
  );
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

      if (event.message?.type === "text") {
        console.log(
          "LINEテキスト:",
          event.message.text
        );
      }

      if (event.message?.type === "image") {
        console.log(
          "LINE画像受信:",
          event.message.id
        );
      }
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
