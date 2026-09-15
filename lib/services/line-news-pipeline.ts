import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { analyzeArticle, generateIndependentAnalysis } from "@/lib/ai";
import { generateLineNewsImage } from "@/lib/services/line-news-image";

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

async function analyzeLineImage(inboxId: number, imageUrl: string, text: string | null, sourceUrl: string | null): Promise<ExtractedNews> {
  const prompt = `
あなたはAI NEWSジャパンの記事素材抽出AIです。

添付画像は、Xの投稿、ニュース記事、LINEニュース、SNS投稿などを撮影したスクリーンショットです。

画像を注意深く読み取り、
「記事化の根拠として画像から確認できる情報」だけを抽出してください。

【絶対ルール】

1. 画像に書かれていない情報を推測しない。
2. 人物名、企業名、商品名、数字、日付などは読めたものだけ使う。
3. 判別できない文字は無理に補完しない。
4. SNSの投稿本文と、画面UI上の数字を区別する。
5. いいね数・リポスト数・返信数・表示数は、画像上で確認できた場合だけ数字を入れる。
6. 投稿者名が読めた場合は記録する。
7. URLが読めた場合は記録する。
8. 写真そのものから人物名や場所を勝手に断定しない。
9. 「画像から確認できる事実」と「推測」を混ぜない。
10. 分からないものは空文字、空配列、nullにする。
11. 日本語で返す。
12. JSONのみ返す。

LINE補足テキスト：
${text ?? ""}

LINEに記録されているURL：
${sourceUrl ?? ""}

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
  "facts": [],
  "visualDescription": "",
  "urls": [],
  "confidence": "high|medium|low"
}
`;

  await prisma.lineInboxItem.update({
    where: { id: inboxId },
    data: {
      status: "analyzing",
      error: null,
    },
  });

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
            image_url: imageUrl,
            detail: "high",
          },
        ],
      },
    ],
  });

  const raw = response.output_text?.trim() ?? "";

  let parsed: Partial<ExtractedNews>;

  try {
    parsed = JSON.parse(
      raw
        .replace(/^```json\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim()
    );
  } catch (error) {
    console.error("[line-pipeline] 解析JSONエラー", error);

    await prisma.lineInboxItem.update({
      where: { id: inboxId },
      data: {
        status: "error",
        error: "AI解析結果のJSON解析に失敗しました",
      },
    });

    throw new Error("AI解析結果のJSON解析に失敗しました");
  }

  const result: ExtractedNews = {
    sourceType: cleanString(parsed.sourceType) || "不明",
    sourceName: cleanString(parsed.sourceName),
    title: cleanString(parsed.title),
    postText: cleanString(parsed.postText),
    author: cleanString(parsed.author),
    publishedAt: cleanString(parsed.publishedAt),
    metrics: {
      likes: cleanNullableNumber(parsed.metrics?.likes),
      reposts: cleanNullableNumber(parsed.metrics?.reposts),
      replies: cleanNullableNumber(parsed.metrics?.replies),
      views: cleanNullableNumber(parsed.metrics?.views),
    },
    facts: Array.isArray(parsed.facts)
      ? parsed.facts.filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0
        )
      : [],
    visualDescription: cleanString(parsed.visualDescription),
    urls: Array.isArray(parsed.urls)
      ? parsed.urls.filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0
        )
      : [],
    confidence:
      parsed.confidence === "high" ||
      parsed.confidence === "medium" ||
      parsed.confidence === "low"
        ? parsed.confidence
        : "low",
  };

  return result;
}

async function generateLineArticle(
  inboxId: number,
  analysis: ExtractedNews,
  inbox: {
    imageUrl: string | null;
    sourceUrl: string | null;
    text: string | null;
  }
) {
  const facts = analysis.facts ?? [];
  const urls = analysis.urls ?? [];

  const articleResponse = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: `
あなたはAI NEWSジャパンの記事編集AIです。

以下は、LINEで受信したスクリーンショットをAI解析した結果です。

スクリーンショットに存在する事実だけを根拠に、
AI NEWSジャパン向けのニュース記事を作成してください。

【絶対ルール】

・解析結果にない情報を追加しない
・推測、憶測、一般論は禁止
・人物名、企業名、数字、日時などを勝手に補完しない
・SNS投稿そのものを記事本文として丸写ししない
・「何が起きたのか」「なぜ話題なのか」が分かる記事にする
・反応数はスクリーンショットに確認できる値だけ使う
・記事として自然な日本語にする
・スクリーンショットから確認できない背景情報は書かない
・ニュースとして成立するタイトルを新しく作る
・タイトルはSNS投稿文の単純なコピーにしない
・広告・宣伝のような表現は禁止

【記事構成】

title:
ニュースとして読める見出し

article:
400〜800文字程度。
スクリーンショットから確認できる事実を中心に、
出来事→内容→反応の順で整理してください。

source:
X / LINEニュース / ニュース / その他

JSONのみ返してください。

{
  "title": "",
  "article": "",
  "source": ""
}

【解析結果】

種別:
${analysis.sourceType}

ソース:
${analysis.sourceName}

タイトル候補:
${analysis.title}

投稿本文:
${analysis.postText}

投稿者:
${analysis.author}

投稿日:
${analysis.publishedAt}

いいね:
${analysis.metrics.likes ?? "不明"}

リポスト:
${analysis.metrics.reposts ?? "不明"}

返信:
${analysis.metrics.replies ?? "不明"}

表示数:
${analysis.metrics.views ?? "不明"}

確認できた事実:
${facts.join("\n")}

画像内容:
${analysis.visualDescription}

確認できたURL:
${urls.join("\n")}

LINE補足:
${inbox.text ?? ""}
`,
  });

  const raw = articleResponse.output_text?.trim() ?? "";

  let generated: {
    title?: string;
    article?: string;
    source?: string;
  };

  try {
    generated = JSON.parse(
      raw
        .replace(/^```json\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim()
    );
  } catch {
    throw new Error("記事生成AIのJSON解析に失敗しました");
  }

  const title = String(generated.title ?? "").trim();
  const article = String(generated.article ?? "").trim();

  if (!title || !article) {
    throw new Error("記事タイトルまたは本文を生成できませんでした");
  }

  const ai = await analyzeArticle(title, article);

  if (!ai.summary) {
    throw new Error("記事AI分析に失敗しました");
  }

  const independentAnalysis = await generateIndependentAnalysis(
    title,
    article
  );

  const source =
    analysis.sourceType === "X"
      ? "X"
      : analysis.sourceName ||
        analysis.sourceType ||
        "LINE";

  const sourceUrl =
    urls[0] ||
    inbox.sourceUrl ||
    `line://inbox/${inboxId}`;

  const createdNews = await prisma.news.create({
    data: {
      title,
      content: article,
      summary: ai.summary,
      supplement: ai.supplement,
      analysisLabel: independentAnalysis.analysisLabel,
      analysis: independentAnalysis.analysis,
      category: ai.category,
      score: ai.score,
      importanceScore: ai.importanceScore,
      buzzScore: ai.buzzScore,
      impactScore: ai.impactScore,
      noveltyScore: ai.noveltyScore,
      attentionScore: ai.attentionScore,
      image: null,
      source,
      sourceUrl,
      publishedAt: null,
    },
    select: {
      id: true,
      title: true,
      summary: true,
      category: true,
      score: true,
    },
  });

  let generatedImage: string | null = null;

  try {
    generatedImage = await generateLineNewsImage(
      createdNews.id,
      inbox.imageUrl
    );
  } catch (imageError) {
    console.error("[line-pipeline] 画像生成失敗", imageError);
  }

  await prisma.lineInboxItem.update({
    where: { id: inboxId },
    data: {
      generatedNewsId: createdNews.id,
      status: "awaiting_approval",
      error: generatedImage
        ? null
        : "記事は生成されましたが画像生成に失敗しました",
    },
  });

  return {
    newsId: createdNews.id,
    title: createdNews.title,
    article,
    summary: createdNews.summary,
    image: generatedImage,
  };
}

export async function processLineInboxItem(inboxId: number) {
  const inbox = await prisma.lineInboxItem.findUnique({
    where: { id: inboxId },
    select: {
      id: true,
      userId: true,
      type: true,
      text: true,
      sourceUrl: true,
      imageUrl: true,
      status: true,
      generatedNewsId: true,
    },
  });

  if (!inbox) {
    throw new Error("LINE受信データが見つかりません");
  }

  if (inbox.generatedNewsId) {
    return null;
  }

  if (!inbox.imageUrl) {
    await prisma.lineInboxItem.update({
      where: { id: inboxId },
      data: {
        status: "error",
        error: "画像URLがありません。スクショ画像を送信してください。",
      },
    });

    throw new Error("画像URLがありません");
  }

  if (
    inbox.status === "processing" ||
    inbox.status === "analyzing" ||
    inbox.status === "awaiting_approval" ||
    inbox.status === "published"
  ) {
    return null;
  }

  await prisma.lineInboxItem.update({
    where: { id: inboxId },
    data: {
      status: "processing",
      error: null,
    },
  });

  try {
    const analysis = await analyzeLineImage(
      inbox.id,
      inbox.imageUrl,
      inbox.text,
      inbox.sourceUrl
    );

    const result = await generateLineArticle(
      inbox.id,
      analysis,
      {
        imageUrl: inbox.imageUrl,
        sourceUrl: inbox.sourceUrl,
        text: inbox.text,
      }
    );

    console.log("[line-pipeline] 完了", result);

    return {
      ...result,
      userId: inbox.userId,
    };
  } catch (error) {
    console.error("[line-pipeline] 処理失敗", error);

    await prisma.lineInboxItem.update({
      where: { id: inboxId },
      data: {
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "LINE記事生成に失敗しました",
      },
    });

    throw error;
  }
}
