import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST() {
  const news = await prisma.news.findFirst({
    orderBy: {
      publishedAt: "desc",
    },
  });

  if (!news) {
    return NextResponse.json(
      { error: "記事がありません" },
      { status: 404 }
    );
  }

  const url = `https://tutti-news-ai-bay.vercel.app/news/${news.id}`;

  const score = news.score ?? 60;

  let hook = "";
  let description = "";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI News ジャパン専属AIニュースキャスター「やんすAI」です。

X投稿専用の短い文章を作成してください。

【目的】
Xからニュースサイトへ読者を誘導することが目的です。

【投稿構成】

① フック
② 短い説明
③ 詳細はこちら
④ URL

【フック】

20〜50文字程度。

読者が「これは気になる」と思って続きを読みたくなる文章にしてください。

以下から記事内容に合うものを選んでください。

・数字
・意外な事実
・問いかけ
・逆説
・意外な組み合わせ

記事本文・要約に存在しない数字や事実は禁止です。

タイトルの単純な言い換えは禁止です。

「え、」「実は」「まさか」の乱用は禁止です。

【説明】

30〜60文字程度。

記事の答えを全部説明しないでください。

読者が「詳しく知りたい」と思う程度の情報だけを残してください。

特に重要な数字や事実を1つだけ使ってください。

説明文だけでニュースの内容が完結しないようにしてください。

【重要】

「詳しくは記事で」
「詳細はサイトで」
などの誘導文は作らないでください。

誘導文はプログラム側で追加します。

【やんすAI】

「でやんす」はフックまたは説明のどちらかに自然に1回だけ使用してください。

「🤖」は禁止です。

【禁止】

・推測
・架空の数字
・架空の事実
・過度な煽り
・長文
・ハッシュタグ
・タイトルの丸写し

必ずJSONだけ返してください。

{
  "hook": "",
  "description": ""
}

【記事情報】

タイトル:
${news.title}

要約:
${news.summary ?? ""}

カテゴリ:
${news.category ?? "国内"}

AI評価:
${score}点
`,
        },
        {
          role: "user",
          content: `
タイトル:
${news.title}

要約:
${news.summary ?? ""}

カテゴリ:
${news.category ?? "国内"}

AI評価:
${score}点

JSONだけ返してください。
`,
        },
      ],
      temperature: 0.8,
      max_tokens: 180,
    });

    const content =
      response.choices[0]?.message?.content ?? "{}";

    const result = JSON.parse(content);

    hook = String(result.hook ?? "").trim();
    description = String(result.description ?? "").trim();

    // AIが「でやんす」を複数入れた場合に整理
    hook = hook
      .replace(/でやんすね/g, "")
      .replace(/でやんす/g, "")
      .trim();

    description = description
      .replace(/でやんすね/g, "")
      .replace(/でやんす/g, "")
      .trim();

    // 「でやんす」は1回だけ付ける
    if (Math.random() < 0.5) {
      hook = `${hook}でやんす`;
    } else {
      description = `${description}でやんす`;
    }
  } catch (error) {
    console.error("X投稿生成エラー:", error);

    hook = "このニュース、ちょっと気になるポイントでやんす";
    description = "記事の詳しい内容と背景を紹介しています。";
  }

  const tweet = `やんすAI
「${hook}」

${description}

👇 詳細はこちら
${url}`;

  return NextResponse.json({
    tweet,
    score,
    intentUrl:
      "https://twitter.com/intent/tweet?text=" +
      encodeURIComponent(tweet),
  });
}