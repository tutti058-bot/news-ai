import { NextResponse, after } from "next/server";
import crypto from "crypto";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import {
  replyLineMessage,
  pushLineMessage,
  createApprovalMessages,
  createProcessingMessage,
} from "@/lib/services/line-messaging";
import { processLineInboxItem } from "@/lib/services/line-news-pipeline";
import { handleLineApproval } from "@/lib/services/line-approval";

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
    `https://api-data.line.me/v2/bot/message/${encodeURIComponent(
      messageId
    )}/content`,
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

function extensionFromContentType(
  contentType: string
) {
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

async function handleApprovalCommand(
  userId: string,
  replyToken: string,
  text: string
) {
  const result = await handleLineApproval(
    userId,
    text
  );

  if (!result) {
    return false;
  }

  await replyLineMessage(replyToken, [
    {
      type: "text",
      text: result.message,
    },
  ]);

  return true;
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

      const replyToken =
        event.replyToken ?? null;

      const webhookEventId =
        event.webhookEventId ?? null;

      /*
       * 「良し」「ダメ」は記事承認コマンドとして処理。
       * 通常のLINE素材としてDBには保存しない。
       */
      if (
        type === "text" &&
        userId &&
        replyToken
      ) {
        const command = String(
          message.text ?? ""
        ).trim();

        if (
          command === "良し" ||
          command === "ダメ"
        ) {
          const handled =
            await handleApprovalCommand(
              userId,
              replyToken,
              command
            );

          if (handled) {
            continue;
          }
        }
      }

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

          if (replyToken) {
            try {
              await replyLineMessage(
                replyToken,
                [
                  {
                    type: "text",
                    text:
                      "❌ 画像の受信に失敗しました。\n" +
                      "もう一度スクショを送ってください。",
                  },
                ]
              );
            } catch (replyError) {
              console.error(
                "LINEエラー返信失敗:",
                replyError
              );
            }
          }

          continue;
        }
      }

      const inbox =
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
          select: {
            id: true,
            imageUrl: true,
            userId: true,
          },
        });

      /*
       * 画像の場合は、まずLINEへ即時受付返信。
       * 重いAI処理はafter()でレスポンス後に実行する。
       */
      if (
        type === "image" &&
        inbox.imageUrl
      ) {
        if (replyToken) {
          try {
            await replyLineMessage(
              replyToken,
              createProcessingMessage()
            );
          } catch (replyError) {
            console.error(
              "LINE受付返信失敗:",
              replyError
            );
          }
        }

        after(async () => {
          try {
            const result =
              await processLineInboxItem(
                inbox.id
              );

            if (
              !result ||
              !result.userId
            ) {
              return;
            }

            console.log(
              "[line/webhook] 記事生成完了。LINEへ送信:",
              result.newsId
            );

            await pushLineMessage(
              result.userId,
              createApprovalMessages({
                title: result.title,
                article: result.article,
                summary: result.summary,
                image: result.image,
              })
            );

            console.log(
              "[line/webhook] 完成通知送信完了:",
              result.newsId
            );
          } catch (error) {
            console.error(
              "[line/webhook] 自動記事生成エラー:",
              error
            );

            if (inbox.userId) {
              try {
                await pushLineMessage(
                  inbox.userId,
                  [
                    {
                      type: "text",
                      text:
                        "❌ 記事生成中にエラーが発生しました。\n\n" +
                        "管理画面のLINE受信欄を確認してください。",
                    },
                  ]
                );
              } catch (pushError) {
                console.error(
                  "LINEエラー通知失敗:",
                  pushError
                );
              }
            }
          }
        });
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
