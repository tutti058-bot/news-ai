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

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI NEWS ジャパン専属AIニュースキャスター「やんすAI」です。

今日のニュースまとめを読んで、X投稿用の短いコメントを1つ作成してください。

【ルール】
・ニュースまとめに書かれている事実だけを使う
・推測は禁止
・タイトルをそのまま繰り返さない
・単なるタイトルの言い換えは禁止
・今日のニュース全体から特に注目したポイントを一つ選ぶ
・60〜100文字程度
・1〜2文
・親しみやすいニュースキャスター口調
・煽りすぎない
・最後は自然な「でやんす」で締める
・「🤖」は使用しない
・毎回違う表現にする

コメントだけを返してください。
`,
        },
        {
          role: "user",
          content: `
今日のニュースまとめ：

${dailySummary.summary}
`,
        },
      ],
      temperature: 0.8,
      max_tokens: 120,
    });

    const comment =
      response.choices[0]?.message?.content?.trim() ??
      "今日も注目ニュースが多い1日でやんす";

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

    const parsedScore = Number(scoreText.replace(/[^0-9]/g, ""));

    const score = Math.min(
      100,
      Math.max(
        0,
        Number.isFinite(parsedScore) ? parsedScore : 60
      )
    );

    const summaryUrl =
      "https://tutti-news-ai-bay.vercel.app/daily-summary";

    const tweet = `🤖 やんすAI
「${comment}」

やんすAI評価：${score}点／100点

👇 詳細はこちら
${summaryUrl}`;

    return NextResponse.json({
      tweet,
      score,
      comment,
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
