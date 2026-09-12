import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const newsId = Number(body.newsId);

    const tweetText =
      typeof body.tweetText === "string"
        ? body.tweetText.trim()
        : "";

    if (!newsId || !tweetText) {
      return NextResponse.json(
        {
          error: "newsIdとtweetTextが必要です",
        },
        { status: 400 }
      );
    }

    const news = await prisma.news.findUnique({
      where: {
        id: newsId,
      },
      select: {
        id: true,
        title: true,
        summary: true,
        category: true,
      },
    });

    if (!news) {
      return NextResponse.json(
        {
          error: "記事が見つかりません",
        },
        { status: 404 }
      );
    }

    const response =
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `
あなたはAI NEWSジャパンのX返信を作る編集アシスタントです。

ニュースに関連するX投稿に対して
思わず目に止まる自然でラフな返信コメントを2パターン作成してください

【目的】
返信を読んだ人が
「わかる」
「それちょっと面白い」
「このアカウント気になる」
と思えるようなコメントを作ります

単なるニュース解説ではなく
Xで人が自然に反応しているような一言を優先してください

【基本トーン】
・ラフで自然
・少しくだけた口調
・堅いニュース記事の文章は禁止
・丁寧すぎる敬語は禁止
・「やんす」「やんすAI」「ボク」は禁止
・大げさなキャラクター口調は禁止
・友達に話すような軽さを少し混ぜる
・説明より感想を優先する

【目に止まる返信】
相手の投稿の具体的なポイントを1つ拾い
そこに自然な感想
軽いツッコミ
共感
驚き
意外性
などを少し加えてください

例えば

「3,500種類はさすがに選ぶだけで酔いそう😂
利酒師に選んでもらえるのはかなり助かるかも」

「非エンジニアでもここまで触れるの普通にすごい
『ちょっと使ってみようかな』が一気に増えそう」

「3,500種類はもう図鑑レベル🍶
こういう店に利酒師がいるの強いな」

のようなテンポを参考にしてください

【重要】
・毎回無理にボケない
・内容に合うときだけ軽いユーモアを使う
・スベりそうな無理なギャグは禁止
・単なる「すごいですね」「便利ですね」「注目ですね」は禁止
・相手の投稿に書かれている具体的な内容を必ず1つ拾う
・記事にない事実を追加しない
・根拠のない推測は禁止
・相手への批判や攻撃は禁止
・宣伝っぽくしない
・「記事を読んでください」などの誘導は禁止
・URLは禁止
・ハッシュタグは禁止
・質問で無理に会話を作らない

【文章形式】
・40〜80文字程度
・2〜3行程度
・短い文を改行でつなぐ
・句点「。」は禁止
・読点「、」は禁止
・自然なXのテンポを優先する

【語尾】
「〜ですね」
「〜かも」
「〜そう」
「〜な気がする」
「〜強いな」
「〜面白そう」
などを自然に使ってください

ただし同じ語尾を連続して使わないでください

【2案のルール】
・コメント①と②は切り口を変える
・同じ構文を繰り返さない
・片方が共感ならもう片方は驚きや別視点にするなど変化をつける
・どちらも単独で自然なX返信にする

必ずJSONだけを返してください。

{
  "reply1": "コメント案1",
  "reply2": "コメント案2"
}
`,
          },
          {
            role: "user",
            content: `
【ニュースタイトル】
${news.title}

【ニュース要約】
${news.summary ?? ""}

【ニュースカテゴリ】
${news.category ?? ""}

【返信したいX投稿】
${tweetText}

この投稿に対する自然な返信コメントを2案作成してください。
`,
          },
        ],
        temperature: 0.9,
        max_tokens: 300,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "x_reply",
            strict: true,
            schema: {
              type: "object",
              properties: {
                reply1: {
                  type: "string",
                },
                reply2: {
                  type: "string",
                },
              },
              required: [
                "reply1",
                "reply2",
              ],
              additionalProperties: false,
            },
          },
        },
      });

    const raw =
      response.choices[0]?.message?.content ??
      "{}";

    let parsed: {
      reply1?: string;
      reply2?: string;
    } = {};

    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        "コメントの解析に失敗しました"
      );
    }

    const cleanReply = (text: string) =>
      text
        .replace(/^「|」$/g, "")
        .replace(/^["']|["']$/g, "")
        .trim();

    const reply1 = cleanReply(
      parsed.reply1 ?? ""
    );

    const reply2 = cleanReply(
      parsed.reply2 ?? ""
    );

    if (!reply1 || !reply2) {
      throw new Error(
        "コメントを生成できませんでした"
      );
    }

    const articleUrl =
      `https://tutti-news-ai-bay.vercel.app/news/${news.id}`;

    return NextResponse.json({
      reply1,
      reply2,
      replyWithUrl1:
        `${reply1}\n\n👇 関連記事はこちら\n${articleUrl}`,
      replyWithUrl2:
        `${reply2}\n\n👇 関連記事はこちら\n${articleUrl}`,
      articleUrl,
    });
  } catch (error) {
    console.error(
      "Xコメント生成エラー:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "コメント生成に失敗しました",
      },
      { status: 500 }
    );
  }
}
