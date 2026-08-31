import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 500;
const MIN_MESSAGE_LENGTH = 3;
const RATE_LIMIT_MINUTES = 30;

function getIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function hashIp(ip: string) {
  const salt =
    process.env.REQUEST_IP_HASH_SALT ||
    "news-ai-request-default-salt";

  return crypto
    .createHash("sha256")
    .update(`${salt}:${ip}`)
    .digest("hex");
}

function countUrls(text: string) {
  return (
    text.match(
      /https?:\/\/|www\./gi
    ) ?? []
  ).length;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim().slice(0, 50)
        : "";

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const honeypot =
      typeof body.website === "string"
        ? body.website.trim()
        : "";

    // bot用の隠し欄に入力があれば拒否
    if (honeypot) {
      return NextResponse.json({
        success: true,
      });
    }

    if (
      message.length < MIN_MESSAGE_LENGTH ||
      message.length > MAX_MESSAGE_LENGTH
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "リクエストは3〜500文字で入力してください。",
        },
        { status: 400 }
      );
    }

    // URLだらけの投稿を抑制
    if (countUrls(message) >= 3) {
      return NextResponse.json(
        {
          success: false,
          error:
            "URLを大量に含むリクエストは送信できません。",
        },
        { status: 400 }
      );
    }

    const ipHash = hashIp(getIp(request));

    const recentSince = new Date(
      Date.now() -
        RATE_LIMIT_MINUTES * 60 * 1000
    );

    // 同一IPの短時間連投を拒否
    const recentRequest =
      await prisma.contentRequest.findFirst({
        where: {
          ipHash,
          createdAt: {
            gte: recentSince,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (recentRequest) {
      return NextResponse.json(
        {
          success: false,
          error:
            "短時間に連続して送信することはできません。しばらく時間を置いてください。",
        },
        { status: 429 }
      );
    }

    // 同じIPから同じ内容を繰り返し送るのを防止
    const duplicateSince = new Date(
      Date.now() -
        24 * 60 * 60 * 1000
    );

    const duplicate =
      await prisma.contentRequest.findFirst({
        where: {
          ipHash,
          message,
          createdAt: {
            gte: duplicateSince,
          },
        },
      });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error:
            "同じ内容のリクエストは送信済みです。",
        },
        { status: 400 }
      );
    }

    await prisma.contentRequest.create({
      data: {
        name: name || null,
        message,
        ipHash,
        status: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "リクエストを受け付けました。ありがとうございます！",
    });
  } catch (error) {
    console.error(
      "Content request error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "リクエストの送信に失敗しました。",
      },
      { status: 500 }
    );
  }
}
