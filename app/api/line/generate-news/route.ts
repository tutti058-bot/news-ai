import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { analyzeArticle, generateIndependentAnalysis } from "@/lib/ai";
import { generateLineNewsImage } from "@/lib/services/line-news-image";
import { isAdminAuthenticated } from "@/lib/adminAuth";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 120;

type AnalysisInput = {
  sourceType?: string;
  sourceName?: string;
  title?: string;
  postText?: string;
  author?: string;
  publishedAt?: string;
  metrics?: {
    likes?: number | null;
    reposts?: number | null;
    replies?: number | null;
    views?: number | null;
  };
  facts?: string[];
  visualDescription?: string;
  urls?: string[];
  confidence?: string;
};

export async function POST(request: Request) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const inboxId = Number(body?.inboxId);
    const analysis = body?.analysis as AnalysisInput | undefined;

    if (!Number.isInteger(inboxId)) {
      return NextResponse.json(
        {
          success: false,
          error: "inboxIdが不正です",
        },
        { status: 400 }
      );
    }

    if (!analysis) {
      return NextResponse.json(
        {
          success: false,
          error: "AI解析結果が必要です",
        },
        { status: 400 }
      );
    }

    const inbox = await prisma.lineInboxItem.findUnique({
      where: { id: inboxId },
      select: {
        id: true,
        imageUrl: true,
        sourceUrl: true,
        text: true,
        generatedNewsId: true,
      },
    });

    if (!inbox) {
      return NextResponse.json(
        {
          success: false,
          error: "LINE受信データが見つかりません",
        },
        { status: 404 }
      );
    }

    if (inbox.generatedNewsId) {
      return NextResponse.json({
        success: true,
        newsId: inbox.generatedNewsId,
        message: "この記事はすでに生成されています",
      });
    }

    const facts = Array.isArray(analysis.facts)
      ? analysis.facts.filter(
          (value): value is string =>
            typeof value === "string" &&
            value.trim().length > 0
        )
      : [];

    const urls = Array.isArray(analysis.urls)
      ? analysis.urls.filter(
          (value): value is string =>
            typeof value === "string" &&
            value.trim().length > 0
        )
      : [];

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
・XなどSNSの場合、投稿上で確認できる反応数も事実として扱ってよい
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
${analysis.sourceType ?? ""}

ソース:
${analysis.sourceName ?? ""}

タイトル候補:
${analysis.title ?? ""}

投稿本文:
${analysis.postText ?? ""}

投稿者:
${analysis.author ?? ""}

投稿日:
${analysis.publishedAt ?? ""}

いいね:
${analysis.metrics?.likes ?? "不明"}

リポスト:
${analysis.metrics?.reposts ?? "不明"}

返信:
${analysis.metrics?.replies ?? "不明"}

表示数:
${analysis.metrics?.views ?? "不明"}

確認できた事実:
${facts.join("\n")}

画像内容:
${analysis.visualDescription ?? ""}

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
      return NextResponse.json(
        {
          success: false,
          error: "記事生成AIのJSON解析に失敗しました",
        },
        { status: 500 }
      );
    }

    const title = String(generated.title ?? "").trim();
    const article = String(generated.article ?? "").trim();

    if (!title || !article) {
      return NextResponse.json(
        {
          success: false,
          error: "記事タイトルまたは本文を生成できませんでした",
        },
        { status: 500 }
      );
    }

    const ai = await analyzeArticle(title, article, {
      sourceType: analysis.sourceType,
      postText: analysis.postText,
      facts: analysis.facts,
      likes: analysis.metrics?.likes ?? null,
      reposts: analysis.metrics?.reposts ?? null,
      replies: analysis.metrics?.replies ?? null,
      views: analysis.metrics?.views ?? null,
    });

    if (!ai.summary) {
      return NextResponse.json(
        {
          success: false,
          error: "記事AI分析に失敗しました",
        },
        { status: 500 }
      );
    }

    const independentAnalysis =
      await generateIndependentAnalysis(
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
        analysisLabel:
          independentAnalysis.analysisLabel,
        analysis:
          independentAnalysis.analysis,
        category: ai.category,
        score: ai.score,
        importanceScore:
          ai.importanceScore,
        buzzScore:
          ai.buzzScore,
        impactScore:
          ai.impactScore,
        noveltyScore:
          ai.noveltyScore,
        attentionScore:
          ai.attentionScore,
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

    console.log(
      "[line/generate-news] 記事画像生成開始",
      createdNews.id
    );

    let generatedImage: string | null = null;

    try {
      generatedImage =
        await generateLineNewsImage(
          createdNews.id,
          inbox.imageUrl
        );

      console.log(
        "[line/generate-news] 記事画像生成完了",
        {
          newsId: createdNews.id,
          image: generatedImage,
        }
      );
    } catch (imageError) {
      console.error(
        "[line/generate-news] 記事画像生成失敗:",
        imageError
      );
    }

    await prisma.lineInboxItem.update({
      where: { id: inboxId },
      data: {
        generatedNewsId: createdNews.id,
        status: "generated",
        error: null,
      },
    });

    return NextResponse.json({
      success: true,
      news: {
        ...createdNews,
        image: generatedImage,
      },
      image: generatedImage,
    });
  } catch (error) {
    console.error(
      "[line/generate-news] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "記事生成に失敗しました",
      },
      { status: 500 }
    );
  }
}
