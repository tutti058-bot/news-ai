import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ExtractedNews = {
  sourceType: string;
  sourceName: string;
  title: string;
  postText: string;
  author: string;
  publishedAt: string;
  metrics: {
    likes: number | null;
    reposts: number | null;
    replies: number | null;
    views: number | null;
  };
  facts: string[];
  visualDescription: string;
  urls: string[];
  confidence: string;
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const n = Number(value);

  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const inboxId = Number(body?.inboxId);

    if (!inboxId) {
      return NextResponse.json(
        { error: "inboxIdが必要です" },
        { status: 400 }
      );
    }

    const inbox = await prisma.lineInboxItem.findUnique({
      where: { id: inboxId },
      select: {
        id: true,
        type: true,
        text: true,
        sourceUrl: true,
        imageUrl: true,
        status: true,
      },
    });

    if (!inbox) {
      return NextResponse.json(
        { error: "LINE受信データが見つかりません" },
        { status: 404 }
      );
    }

    if (!inbox.imageUrl) {
      return NextResponse.json(
        {
          error:
            "画像URLがありません。スクショ画像を先に受信してください。",
        },
        { status: 400 }
      );
    }

    console.log("[line/analyze] 解析開始", {
      inboxId,
      imageUrl: inbox.imageUrl,
    });

    await prisma.lineInboxItem.update({
      where: { id: inboxId },
      data: {
        status: "analyzing",
        error: null,
      },
    });

    const prompt = `
あなたはAI NEWSジャパンの記事素材抽出AIです。

添付画像は、Xの投稿、ニュース記事、LINEニュース、SNS投稿などを
撮影したスクリーンショットである可能性があります。

画像を注意深く読み取り、
「記事化の根拠として画像から確認できる情報」だけを抽出してください。

最重要ルール：

1. 画像に書かれていない情報を推測しない。
2. 人物名、企業名、商品名、数字、日付などは読めたものだけ使う。
3. 判別できない文字は無理に補完しない。
4. SNSの投稿本文と、画面UI上の数字を区別する。
5. いいね数・リポスト数・返信数・表示数は、
   画像上で確認できた場合だけ数字を入れる。
6. 投稿者名が読めた場合は記録する。
7. URLが読めた場合は記録する。
8. 写真そのものから勝手に人物名や場所を断定しない。
9. 「画像から確認できる事実」と「推測」を混ぜない。
10. 分からないものは空文字、空配列、nullにする。
11. 日本語で返す。
12. JSONのみ返す。

画像に加えて、LINEから送られてきた補足テキストがあれば参考情報として扱う。
ただし、補足テキストだけを根拠に画像にない事実を追加してはいけません。

JSON形式：

{
  "sourceType": "X|ニュース|LINEニュース|その他|不明",
  "sourceName": "",
  "title": "",
  "postText": "",
  "author": "",
  "publishedAt": "",
  "metrics": {
    "likes": null,
    "reposts": null,
    "replies": null,
    "views": null
  },
  "facts": [
    "画像から確認できる事実1",
    "画像から確認できる事実2"
  ],
  "visualDescription": "画像に写っている内容を客観的に説明",
  "urls": [],
  "confidence": "high|medium|low"
}

LINE補足テキスト：
${inbox.text ?? ""}

LINEに記録されているURL：
${inbox.sourceUrl ?? ""}
`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            {
              type: "input_image",
              image_url: inbox.imageUrl,
              detail: "high",
            },
          ],
        },
      ],
    });

    const raw = response.output_text?.trim() ?? "";

    console.log(
      "[line/analyze] AI raw response:",
      raw
    );

    let parsed: Partial<ExtractedNews>;

    try {
      parsed = JSON.parse(
        raw
          .replace(/^```json\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim()
      );
    } catch (error) {
      console.error(
        "[line/analyze] JSON解析エラー",
        error
      );

      await prisma.lineInboxItem.update({
        where: { id: inboxId },
        data: {
          status: "error",
          error: "AI解析結果のJSON解析に失敗しました",
        },
      });

      return NextResponse.json(
        {
          error: "AI解析結果のJSON解析に失敗しました",
          raw,
        },
        { status: 500 }
      );
    }

    const result: ExtractedNews = {
      sourceType: cleanString(parsed.sourceType) || "不明",
      sourceName: cleanString(parsed.sourceName),
      title: cleanString(parsed.title),
      postText: cleanString(parsed.postText),
      author: cleanString(parsed.author),
      publishedAt: cleanString(parsed.publishedAt),
      metrics: {
        likes: cleanNullableNumber(
          parsed.metrics?.likes
        ),
        reposts: cleanNullableNumber(
          parsed.metrics?.reposts
        ),
        replies: cleanNullableNumber(
          parsed.metrics?.replies
        ),
        views: cleanNullableNumber(
          parsed.metrics?.views
        ),
      },
      facts: Array.isArray(parsed.facts)
        ? parsed.facts.filter(
            (value): value is string =>
              typeof value === "string" &&
              value.trim().length > 0
          )
        : [],
      visualDescription:
        cleanString(parsed.visualDescription),
      urls: Array.isArray(parsed.urls)
        ? parsed.urls.filter(
            (value): value is string =>
              typeof value === "string" &&
              value.trim().length > 0
          )
        : [],
      confidence:
        parsed.confidence === "high" ||
        parsed.confidence === "medium" ||
        parsed.confidence === "low"
          ? parsed.confidence
          : "low",
    };

    console.log(
      "[line/analyze] 解析結果:",
      JSON.stringify(result, null, 2)
    );

    /*
     * 現段階ではNewsへ自動登録しない。
     * まずLINE受信データを解析済みとして保存する。
     *
     * 既存のLineInboxItemには解析JSON保存用カラムがまだないため、
     * generatedNewsIdなどを記事生成まで流用せず、
     * 次のDB拡張で正式に素材データを保存する。
     */
    await prisma.lineInboxItem.update({
      where: { id: inboxId },
      data: {
        status: "analyzed",
        error: null,
      },
    });

    return NextResponse.json({
      success: true,
      inboxId,
      result,
    });
  } catch (error) {
    console.error(
      "[line/analyze] エラー:",
      error
    );

    return NextResponse.json(
      {
        error: "LINE画像解析に失敗しました",
      },
      { status: 500 }
    );
  }
}
