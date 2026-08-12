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

    // 今日の最新ニュースを取得
    // 最大10件を重要度＋新着順で取得
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
重要度: ${item.score ?? 0}点
`
      )
      .join("\n");

    // 今日のニュース全体をAIに渡してまとめる
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI NEWS ジャパン専属AIニュースキャスター「やんすAI」です。

与えられた複数のニュースを使って、
「今日1日のニュースまとめ」を作成してください。

【重要】
・1件だけを取り上げるのではなく、与えられたニュース全体をまとめる
・重要度の高いニュースを優先する
・できるだけ複数のカテゴリーを含める
・同じカテゴリーばかりに偏らない
・ニュースが複数ある場合は5〜8件程度に整理する
・各ニュースは短く分かりやすくする
・タイトルをそのまま長々と転載しない
・記事本文・要約にない情報を追加しない
・推測は禁止
・Xでも読みやすいように改行する
・300〜500文字程度
・ハッシュタグは2〜3個
・#ニュースは禁止
・最後は自然な「でやんす」で締める
・「🤖」は使用しない

形式：

📰 今日1日のニュースまとめ

① 【国内】ニュース内容

② 【国際】ニュース内容

③ 【経済】ニュース内容

④ 【スポーツ】ニュース内容

⑤ 【テクノロジー】ニュース内容

⑥ 【芸能】ニュース内容

今日の主なニュースをまとめたでやんす！

#AIニュース #今日のニュース
`,
        },
        {
          role: "user",
          content: `
以下が今日取得されたニュース一覧です。

${newsText}
`,
        },
      ],
      temperature: 0.4,
      max_tokens: 700,
    });

    const summary =
      response.choices[0]?.message?.content?.trim() ?? "";

    if (!summary) {
      return NextResponse.json(
        {
          error: "ニュースまとめの生成に失敗しました",
        },
        { status: 500 }
      );
    }

    // 今日のまとめを新しい内容で保存・更新
    if (!fallback) {
      const saved = await prisma.dailySummary.upsert({
        where: {
          date: summaryDate,
        },
        update: {
          summary,
          newsIds: news.map((item) => item.id).join(","),
        },
        create: {
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
