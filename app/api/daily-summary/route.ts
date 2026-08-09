import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
    const now = new Date();

    // 日本時間
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);

    const year = jstNow.getUTCFullYear();
    const month = jstNow.getUTCMonth();
    const date = jstNow.getUTCDate();

    const startJST = new Date(
      Date.UTC(year, month, date, 0, 0, 0) - jstOffset
    );

    const endJST = new Date(
      Date.UTC(year, month, date + 1, 0, 0, 0) - jstOffset
    );

    const summaryDate = new Date(
      Date.UTC(year, month, date)
    );

    // 今日すでに作成済みならDBから返す
    const existing = await prisma.dailySummary.findUnique({
      where: {
        date: summaryDate,
      },
    });

    if (existing) {
      const newsIds = existing.newsIds
        .split(",")
        .filter(Boolean)
        .map(Number);

      const savedNews = await prisma.news.findMany({
        where: {
          id: {
            in: newsIds,
          },
        },
        orderBy: {
          score: "desc",
        },
      });

      return NextResponse.json({
        date: `${year}-${String(month + 1).padStart(2, "0")}-${String(
          date
        ).padStart(2, "0")}`,
        count: savedNews.length,
        summary: existing.summary,
        news: savedNews.map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          score: item.score,
          url: `/news/${item.id}`,
        })),
        cached: true,
      });
    }

    // まず今日のニュースを取得
    let news = await prisma.news.findMany({
      where: {
        publishedAt: {
          gte: startJST,
          lt: endJST,
        },
      },
      orderBy: [
        {
          score: "desc",
        },
        {
          publishedAt: "desc",
        },
      ],
      take: 10,
    });

    // 今日のニュースがない場合は最新ニュースを取得
    let fallback = false;

    if (news.length === 0) {
      news = await prisma.news.findMany({
        orderBy: [
          {
            publishedAt: "desc",
          },
          {
            score: "desc",
          },
        ],
        take: 10,
      });

      fallback = true;
    }

    if (news.length === 0) {
      return NextResponse.json(
        {
          error: "ニュースがありません",
        },
        { status: 404 }
      );
    }

    const newsText = news
      .map(
        (item, index) => `
${index + 1}.
カテゴリ: ${item.category ?? "国内"}
タイトル: ${item.title}
要約: ${item.summary ?? ""}
重要度: ${item.score}点
`
      )
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI NEWS ジャパン専属AIニュースキャスター「やんすAI🤖」です。

与えられたニュースだけを使ってニュースまとめを作成してください。

【ルール】
・事実にない情報を追加しない
・重要度の高いニュースを優先する
・5〜8件程度に厳選する
・複数カテゴリーをできるだけ含める
・同じカテゴリーばかりにならないようにする
・各ニュースは短く分かりやすくする
・タイトルをそのまま長々と転載しない
・Xで読みやすいように改行する
・300〜500文字程度
・ハッシュタグは2〜3個
・#ニュースは禁止
・最後の一文は自然に「〜でやんす🤖」で締める

形式：

📰 今日1日のニュースまとめ

① 【国内】ニュース内容

② 【国際】ニュース内容

③ 【経済】ニュース内容

④ 【スポーツ】ニュース内容

⑤ 【テクノロジー】ニュース内容

⑥ 【エンタメ】ニュース内容

今日の主なニュースをまとめたでやんす🤖

#AIニュース #今日のニュース
`,
        },
        {
          role: "user",
          content: `ニュース一覧です。

${newsText}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 700,
    });

    const summary =
      response.choices[0]?.message?.content?.trim() ?? "";

    // 今日の記事がある場合だけ「今日のまとめ」として保存
    if (!fallback) {
      const saved = await prisma.dailySummary.create({
        data: {
          date: summaryDate,
          summary,
          newsIds: news.map((item) => item.id).join(","),
        },
      });

      return NextResponse.json({
        date: `${year}-${String(month + 1).padStart(2, "0")}-${String(
          date
        ).padStart(2, "0")}`,
        count: news.length,
        summary: saved.summary,
        news: news.map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          score: item.score,
          url: `/news/${item.id}`,
        })),
        cached: false,
        fallback: false,
      });
    }

    // 今日のニュースがまだない場合
    return NextResponse.json({
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(
        date
      ).padStart(2, "0")}`,
      count: news.length,
      summary,
      news: news.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        score: item.score,
        url: `/news/${item.id}`,
      })),
      cached: false,
      fallback: true,
    });
  } catch (error) {
    console.error("今日のニュースまとめ生成エラー:", error);

    return NextResponse.json(
      {
        error: "今日のニュースまとめ生成に失敗しました",
      },
      { status: 500 }
    );
  }
}
