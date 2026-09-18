import OpenAI from "openai";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateLineNewsImage(
  newsId: number,
  sourceImageUrl: string | null
) {
  const news = await prisma.news.findUnique({
    where: { id: newsId },
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
    },
  });

  if (!news) {
    throw new Error("記事が見つかりません");
  }

  const prompt = `
AI NEWSジャパンのニュース記事用アイキャッチ画像を生成してください。

【最重要】
これはLINEから送られてきた情報を元に作成されたニュース記事です。
画像は「現実のニュースサイトで使われる報道写真・ニュース写真」のような
リアルで自然なビジュアルにしてください。

【完全禁止】
- 漫画
- 劇画
- アニメ
- アメリカンコミック
- ジョジョ風表現
- バトル漫画
- スタンド風キャラクター
- マスコット
- ヤニネコ
- 猫キャラクター
- 超常的な人型存在
- 派手なポスター表現
- ポップアート
- 過剰なエフェクト
- 不要な文字
- 説明パネル
- インフォグラフィック
- 架空のロゴ
- 架空のニュース見出し
- 不自然な人体
- 不自然な顔
- 不要な人物の追加

【画像の方向性】
- 写実的
- 報道写真風
- 自然なライティング
- 現実的なカメラ撮影
- 写真として自然な遠近感
- ニュースメディアのトップ画像として成立する構図
- 過剰にドラマチックにしない
- 現実世界で実際に撮影されたような雰囲気

【人物構成ルール】

- 人物がニュースの主役の場合は、原則として主役の人物を1人だけ配置する
- 元画像が集合写真でも、ニュースの主役が特定できる場合は、その人物を中心に1人だけ描く
- 同じ人物の顔を複数生成したり、同一人物を複数箇所に配置したりしない
- 顔を並べる構図、分身のような表現、同一人物の重複は禁止
- ニュース内容そのものが複数人物・グループ・チームを主役としている場合のみ、必要な人数を自然に配置する
- 人物を増やすことで画面を埋めようとしない
- 主役となる人物が不要なニュースでは、人物を無理に入れず、場所・建物・製品・物・出来事などを主役にする

【元画像について】
元画像が人物の写真・SNS投稿・ニュース画像の場合、
人物や服装、状況、構図を参考情報として扱ってください。
元画像そのものをそのまま複製するのではなく、
ニュース記事用の自然な報道写真として再構成してください。

実在人物が写っている場合、
その人物が記事の主役であることが確認できる範囲で、
顔・髪型・服装・雰囲気などの特徴を可能な限り維持してください。

ただし、元画像に存在しない人物を勝手に追加しないでください。

【記事タイトル】
${news.title}

【記事要約】
${news.summary ?? ""}

【記事本文】
${news.content ?? ""}

画像は横長のニュースサイト用アイキャッチ。
文字を画像内に入れないでください。
`;

  let result;

  if (sourceImageUrl) {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
以下の元画像を参考に、先ほどの指示に従って
リアルな報道写真風のニュース画像を設計してください。

重要：
元画像の内容と記事内容を優先し、
漫画・アニメ・キャラクター表現には変換しないでください。
`,
            },
            {
              type: "input_image",
              image_url: sourceImageUrl,
              detail: "high",
            },
          ],
        },
      ],
    });

    const visualDescription = response.output_text?.trim() || "";

    result = await openai.images.generate({
      model: "gpt-image-2",
      prompt: `
${prompt}

【元画像から確認できた視覚情報】
${visualDescription}

上記の情報だけを参考に、
完全にリアルなニュース写真風の画像を生成してください。

最優先は「実際の報道写真に見えること」です。
`,
      size: "1536x1024",
      quality: "medium",
    });
  } else {
    result = await openai.images.generate({
      model: "gpt-image-2",
      prompt,
      size: "1536x1024",
      quality: "medium",
    });
  }

  const base64 = result.data?.[0]?.b64_json;

  if (!base64) {
    throw new Error("LINE記事画像の生成結果が取得できませんでした");
  }

  const buffer = Buffer.from(base64, "base64");

  const blob = await put(
    `line-news-images/${news.id}-${Date.now()}.png`,
    buffer,
    {
      access: "public",
      contentType: "image/png",
    }
  );

  await prisma.news.update({
    where: { id: news.id },
    data: {
      image: blob.url,
    },
  });

  return blob.url;
}

export async function saveLineNewsSourceImage(
  newsId: number,
  imageUrl: string
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);

    let response: Response;

    try {
      response = await fetch(imageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Referer": imageUrl,
        },
        redirect: "follow",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.log(
        "[line-pipeline] 元記事画像の取得失敗:",
        response.status,
        imageUrl
      );
      return null;
    }

    const contentType =
      response.headers.get("content-type")?.split(";")[0].trim() || "";

    if (!contentType.startsWith("image/")) {
      console.log(
        "[line-pipeline] 元記事画像ではないレスポンス:",
        contentType,
        imageUrl
      );
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length < 1000) {
      console.log(
        "[line-pipeline] 元記事画像のサイズが小さすぎます:",
        buffer.length,
        imageUrl
      );
      return null;
    }

    const extension =
      contentType === "image/jpeg"
        ? "jpg"
        : contentType === "image/webp"
          ? "webp"
          : contentType === "image/gif"
            ? "gif"
            : contentType === "image/svg+xml"
              ? "svg"
              : "png";

    const blob = await put(
      `line-news-images/source-${newsId}-${Date.now()}.${extension}`,
      buffer,
      {
        access: "public",
        contentType,
      }
    );

    await prisma.news.update({
      where: { id: newsId },
      data: {
        image: blob.url,
      },
    });

    console.log(
      "[line-pipeline] 元記事画像を保存しました:",
      blob.url
    );

    return blob.url;
  } catch (error) {
    console.error(
      "[line-pipeline] 元記事画像保存エラー:",
      imageUrl,
      error
    );
    return null;
  }
}
