import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST() {
  try {
    const now = new Date();

    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);

    const year = jstNow.getUTCFullYear();
    const month = jstNow.getUTCMonth();
    const date = jstNow.getUTCDate();

    const summaryDate = new Date(Date.UTC(year, month, date));

    const dailySummary = await prisma.dailySummary.findUnique({
      where: {
        date: summaryDate,
      },
    });

    if (!dailySummary) {
      return NextResponse.json(
        {
          error: "今日のニュースまとめがありません",
        },
        { status: 404 }
      );
    }

    // ========================================
    // やんすAIコメント生成
    // ========================================

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI NEWS ジャパン専属AIニュースキャスター「やんすAI」です。

今日のニュースまとめから、X投稿用の文章を作成してください。

必ずJSON形式だけで返してください。

{
  "hook": "",
  "description": ""
}

【hook】

15〜50文字程度。

読者が「これは気になる」と思う短いフックを作ってください。

数字、具体的な事実、意外な組み合わせ、問いかけなど、
ニュース内容に合った切り口を使ってください。

記事に存在しない数字や事実は禁止です。

タイトルの単純な言い換えは禁止です。

最後は「でやんす」で締めてください。

【description】

30〜50文字程度。

hookの続きを短く説明してください。

ニュースの具体的なポイントを1つだけ入れてください。

長い説明は禁止です。

記事の内容を全部説明しないでください。

読者が「詳しく知りたい」と思う程度にしてください。

「詳しくは記事で」などは入れないでください。

descriptionには「でやんす」を入れないでください。

【重要】

・ニュースまとめに書かれている事実だけを使用
・推測禁止
・架空の数字禁止
・架空の情報禁止
・煽りすぎない
・自然な日本語
・親しみやすいニュースキャスター口調
・「🤖」禁止
・JSONだけ返す
・Markdown禁止
・禁止

【今日のニュースまとめ】

${dailySummary.summary}
`,
        },
        {
          role: "user",
          content: `
今日のニュースまとめ：

${dailySummary.summary}

以下のJSONだけ返してください。

{
  "hook": "",
  "description": ""
}
`,
        },
      ],
      temperature: 0.8,
      max_tokens: 180,
    });

    let content =
      response.choices[0]?.message?.content?.trim() ?? "{}";

    // AIが ```json を付けた場合に除去
    content = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let result: {
      hook?: string;
      description?: string;
    };

    try {
      result = JSON.parse(content);
    } catch (error) {
      console.error("X投稿JSON解析エラー:", content);

      return NextResponse.json(
        {
          error: "X投稿文の生成に失敗しました",
        },
        { status: 500 }
      );
    }

    let hook = String(result.hook ?? "").trim();
    let description = String(result.description ?? "").trim();

    // AIが「でやんす」を入れた場合は削除
    hook = hook
      .replace(/でやんすね/g, "")
      .replace(/でやんす/g, "")
      .trim();

    description = description
      .replace(/でやんすね/g, "")
      .replace(/でやんす/g, "")
      .trim();

    if (!hook) {
      hook = "今日のニュースで気になる話題がありました";
    }

    if (!description) {
      description = "その背景と詳しい内容とは？";
    }

    // 「でやんす」はフックの最後に1回だけ
    hook = `${hook}でやんす`;

    // ========================================
    // AI評価
    // ========================================

    const scoreResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
ニュースまとめ全体の重要度を0〜100点で評価してください。

評価基準：
・社会的影響
・話題性
・ニュースとしての重要度
・国内外への影響
・注目度

必ず0〜100の整数だけを返してください。
数字以外は返さないでください。
`,
        },
        {
          role: "user",
          content: dailySummary.summary,
        },
      ],
      temperature: 0.2,
      max_tokens: 10,
    });

    const scoreText =
      scoreResponse.choices[0]?.message?.content?.trim() ?? "60";

    const parsedScore = Number(
      scoreText.replace(/[^0-9]/g, "")
    );

    const score = Math.min(
      100,
      Math.max(
        0,
        Number.isFinite(parsedScore) ? parsedScore : 60
      )
    );

    // ========================================
    // 詳細ページURL
    // ========================================

    const summaryUrl =
      "https://tutti-news-ai-bay.vercel.app/daily-summary";

    // ========================================
    // X投稿
    // ========================================

    const tweet = `やんすAI
「${hook}」
${description}

AI評価：${score}点／100点

👇 詳細はこちら
${summaryUrl}`;

    return NextResponse.json({
      tweet,
      score,
      hook,
      description,
      intentUrl:
        "https://twitter.com/intent/tweet?text=" +
        encodeURIComponent(tweet),
    });
  } catch (error) {
    console.error("今日のニュースX投稿生成エラー:", error);

    return NextResponse.json(
      {
        error: "X投稿の生成に失敗しました",
      },
      { status: 500 }
    );
  }
}