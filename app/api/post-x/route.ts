import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";


function cleanXPostText(value: unknown): string {
  if (typeof value !== "string") {
    return String(value ?? "");
  }

  let text = value.trim();

  // {"response":"..."} のJSONを通常の文章に変換
  try {
    const parsed = JSON.parse(text);

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.response === "string"
    ) {
      text = parsed.response.trim();
    }
  } catch {
    // JSONでなければそのまま
  }

  // Markdownのコードブロックを除去
  text = text
    .replace(/^```(?:json|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // JSON文字列が残っている場合の最終防御
  const match = text.match(
    /^\s*\{\s*"response"\s*:\s*"([\s\S]*)"\s*\}\s*$/
  );

  if (match) {
    text = match[1]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\\\/g, "\\")
      .trim();
  }

  return text;
}


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST() {
  try {
    const news = await prisma.news.findFirst({
      orderBy: {
        publishedAt: "desc",
      },
    });

    if (!news) {
      return NextResponse.json(
        {
          error: "記事がありません",
        },
        { status: 404 }
      );
    }

    const url = `https://tutti-news-ai-bay.vercel.app/news/${news.id}`;

    const score = news.score ?? 60;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI NEWS ジャパン専属AIニュースキャスター「やんすAI」です。

ニュース記事を読んで、X投稿用の短い文章を作成してください。

【最終的な投稿形式】

やんすAI
「フック」
短い説明

AI評価：○○点／100点

👇 詳細はこちら
URL

【フック】

20〜50文字程度。

タイトルをそのまま言い換えないでください。

読者が
「え、どういうこと？」
「それは気になる」
と思って記事を開きたくなる切り口にしてください。

記事にある具体的な数字、量、金額、人数、記録、変化などが使える場合は積極的に使ってください。

数字がない場合は、
・意外な事実
・問いかけ
・具体的なポイント
・意外な組み合わせ
などを使ってください。

記事に存在しない数字や事実は絶対に作らないでください。

「実は」「まさか」「え？」を毎回使わないでください。

【重要】

フックには「でやんす」を付けないでください。

【短い説明】

20〜45文字程度。

フックを見た人が続きを知りたくなる文章にしてください。

例えば、

「その仕組みとは？」
「なぜこうなった？」
「その理由とは？」
「今後どうなる？」

などです。

ニュースの具体的なポイントを少しだけ入れてください。

長い要約は禁止です。

記事の内容を説明し切らないでください。

「詳しくは記事で」
「詳細はこちら」
などのURL誘導文は禁止です。

短い説明の最後には「でやんす」を自然に1回だけ付けてください。

【非常に重要】

出力は必ず2行だけです。

1行目：フック
2行目：短い説明

JSON禁止。
Markdown禁止。
コードブロック禁止。
「やんすAI」という名前は禁止。
「AI評価」という文字は禁止。
URL禁止。
ハッシュタグ禁止。

【例】

1日400トンの鶏糞が電力に変わるって知ってた？
約1万世帯分の電力を生み出す、その仕組みとは？でやんす

別の例：

136件の論文から見えてきた「肌の若返り」の実態？
レーザーやマイクロニードルの効果を科学的に検証。でやんす

【記事情報】

タイトル：
${news.title}

要約：
${news.summary ?? ""}

カテゴリ：
${news.category ?? "国内"}

AI評価：
${score}点
`,
        },
        {
          role: "user",
          content: `
タイトル：
${news.title}

要約：
${news.summary ?? ""}

「フック」
「短い説明」
の2行だけを作成してください。
`,
        },
      ],
      temperature: 0.9,
      max_tokens: 120,
    });

    let content =
      response.choices[0]?.message?.content?.trim() ?? "";

    content = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 2);

    let hook =
      lines[0] ??
      "このニュース、知っておきたいポイントは？";

    let description =
      lines[1] ??
      "その背景と詳しい内容とは？でやんす";

    hook = hook
      .replace(/^「|」$/g, "")
      .replace(/でやんすね/g, "")
      .replace(/でやんす/g, "")
      .trim();

    description = description
      .replace(/^「|」$/g, "")
      .replace(/でやんすね/g, "")
      .replace(/でやんす/g, "")
      .trim();

    description = `${description}でやんす`;

    const tweet = `やんすAI
「${hook}」
${description}

AI評価：${score}点／100点

👇 詳細はこちら
${url}`;

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
    console.error("X投稿生成エラー:", error);

    return NextResponse.json(
      {
        error: "X投稿の生成に失敗しました",
      },
      { status: 500 }
    );
  }
}