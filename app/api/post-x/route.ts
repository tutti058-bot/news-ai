import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanText(value: unknown): string {
  if (typeof value !== "string") {
    return String(value ?? "");
  }

  let text = value.trim();

  // コードブロック除去
  text = text
    .replace(/^```(?:json|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // JSON文字列が残っている場合に可能な限り展開
  for (let i = 0; i < 2; i++) {
    try {
      const parsed = JSON.parse(text);

      if (typeof parsed === "string") {
        text = parsed.trim();
        continue;
      }

      if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;

        const candidates = [
          obj.hook,
          obj.description,
          obj.result,
          obj.response,
          obj.content,
          obj.text,
          obj.message,
        ];

        const found = candidates.find(
          (v): v is string =>
            typeof v === "string" && v.trim().length > 0
        );

        if (found) {
          text = found.trim();
          continue;
        }
      }
    } catch {
      // 通常の文章
    }

    break;
  }

  // JSON風文字列を除去
  text = text
    .replace(
      /^\s*\{\s*["'](?:result|response|content|text|message|hook|description)["']\s*:\s*["']([\s\S]*?)["']\s*\}\s*$/i,
      "$1"
    )
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*#+\s*/gm, "")
    .trim();

  return text;
}

function cleanHook(value: unknown): string {
  let text = cleanText(value)
    .replace(/^「|」$/g, "")
    .replace(/でやんす[。！!]?$/g, "")
    .trim();

  // JSON風の外側が残った場合
  text = text
    .replace(/^\s*\{\s*["'][^"']*["']\s*:\s*["']?/g, "")
    .replace(/["']\s*\}\s*$/g, "")
    .trim();

  return text;
}

function cleanDescription(value: unknown): string {
  let text = cleanText(value)
    .replace(/^「|」$/g, "")
    .replace(/でやんす[。！!]?$/g, "")
    .trim();

  // JSON風の外側が残った場合
  text = text
    .replace(/^\s*\{\s*["'][^"']*["']\s*:\s*["']?/g, "")
    .replace(/["']\s*\}\s*$/g, "")
    .trim();

  const strongEnding =
    /[！!]\s*$/.test(text) ||
    /(大きな|劇的|快挙|決定|逆転|優勝|突破|初|注目|期待|衝撃)/.test(text);

  text = text.replace(/[。！!]+$/g, "").trim();

  return `${text}${strongEnding ? "でやんす！" : "でやんす。"}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const newsId = Number(body.newsId);

    if (!newsId) {
      return NextResponse.json(
        {
          error: "newsIdが必要です",
        },
        { status: 400 }
      );
    }

    const news = await prisma.news.findUnique({
      where: {
        id: newsId,
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
あなたはAI NEWSジャパン専属AIニュースキャスター「やんすAI」です。

ニュース記事を読み、Xで「思わず手を止める」「内容を理解したくなる」「自然に反応したくなる」投稿文を作成してください。

AI NEWSジャパンの投稿は、単なるニュースの転載やタイトルの要約ではありません。

ニュースそのものの価値を伝えながら、
やんすAIならではの視点を少し加え、
読んだ人の中に自然な興味や会話の余白が生まれる投稿を作ってください。

ただし、無理に質問したり、
毎回「どう思いますか？」と聞いたり、
コメントや拡散をお願いしたりすることは禁止です。

【投稿の基本構造】

投稿は以下の2つで構成します。

1. hook
2. description

最終的な投稿は、

【hook】

description

記事URL

という形になります。

記事URLはシステム側で自動追加されます。

────────────────

【hook】

15〜40文字程度。

スクロール中に自然と目を止めてもらえる一言を作成してください。

ただし、内容を隠した煽りは禁止です。

悪い例：
「え、どういうこと？」
「衝撃」
「まさか」
「これはヤバい」

このような、ニュースの中身が分からない煽りは禁止です。

良い方向性：

・これは今後かなり影響がありそう
・ここが一番気になる
・意見が分かれそうなニュース
・見逃せない動き
・ファンによって見方が違いそう

ニュースの重要性や特徴を、
やんすAIらしい自然な言葉で表現してください。

タイトルの完全コピーは禁止です。

hookには「でやんす」を付けないでください。

────────────────

【description】

40〜70文字程度を目安にしてください。

長く説明しすぎないでください。

基本は次の2つだけです。

① ニュースの重要な事実
② やんすAI独自の具体的な着眼点

ニュース説明を繰り返したり、
最後に感想を追加して文章を長くすることは禁止です。

独自視点を入れるために文章を増やすのではなく、
不要な説明を削って簡潔にしてください。

投稿だけを読んでもニュース内容が理解できるようにしてください。

記事に書かれている重要な事実を隠して、
続きをクリックさせようとする文章は禁止です。

ニュースの説明だけで終わらせないでください。

【最重要】
descriptionには必ず1つ以上、
「やんすAI自身がこのニュースのどこに注目したのか」
という独自の着眼点・短い考察を入れてください。

単なるニュース要約だけで終了することは禁止です。

【URL誘導は禁止】
description内に
「詳しくはこちら」
「リンクはこちら」
「記事はこちら」
「続きはこちら」
などのURL誘導文は絶対に入れないでください。

記事URLはシステム側で本文の最後に自動追加されます。

ニュースの事実を説明したあと、
必ず「このニュースで特に重要なのは何か」を、
やんすAIの視点として自然に加えてください。

例えば、

「個人的には○○の部分が一番気になるでやんす」
「注目したいのは○○という点でやんす」
「実は○○が今後のポイントになりそうでやんす」
「ここから○○が変わる可能性もありそうでやんす」
「ファンによって見方が違いそうでやんすね」

など、ニュース内容に合わせた具体的な着眼点を入れてください。

重要なのは、
単に「今後に注目です」と言うことではありません。

【独自視点の重要ルール】

ニュース本文に書かれている内容を、
言い換えただけでは「独自視点」になりません。

例えば、

悪い例：
「次世代SDVでの共通化が注目ポイントでやんす」
「今回の共同開発が重要な動きでやんす」

これはニュースの要約を言い換えただけです。

必ず、
ニュースの中から「やんすAIが特に気になった具体的なポイント」を1つ選んでください。

そして、

「何に注目したのか」
「なぜそこが気になるのか」

が短くても分かる文章にしてください。

良い例：
「個人的に気になるのは、経営統合には至らなかった両社が技術面では連携を深めている点でやんす。」

抽象的な
「注目です」
「重要です」
「大きな動きです」
だけで独自視点を終わらせることは禁止です。

悪い例：
「今後の動きに注目ですでやんす。」
「今後の展開が気になるでやんす。」
「これからどうなるのか楽しみでやんす。」

良い例：
「個人的には、広告が実験段階からOpenAIの大きな収益源になり始めている点が一番気になるでやんす。」
「注目したいのは、この決定によって今後のチーム編成がどう変わるのかという点でやんす。」

ただし、記事に書かれていない事実を追加したり、
根拠のない推測をしてはいけません。

毎回同じ表現を使わず、
ニュース内容に合わせて着眼点を変化させてください。

・一番気になるのはどこか
・本当に重要なのは何か
・今後のポイントは何か
・ファンや利用者への影響は何か
・なぜこのニュースが注目されるのか

これらを参考に、
必ずニュース固有の視点を1つ入れてください。

無理に質問文にする必要はありません。

「みんなはどう思う？」
「コメントしてね」
などの定型的なエンゲージメント誘導は禁止です。

────────────────

【やんすAIの口調】

最後は自然な「でやんす」で締めてください。

通常ニュース：
「でやんす。」

大きなニュース、期待感、スポーツの盛り上がり：
「でやんす！」

ただし、不自然に全ての文章へ「でやんす」を付けないでください。

キャラクター感よりも、
自然なニュースコメントとして読めることを優先してください。

ロボットのような定型文は禁止です。

────────────────

【最重要ルール】

・記事に存在しない事実は禁止
・記事にない数字は禁止
・記事にない人物情報は禁止
・根拠のない推測は禁止
・過度な煽りは禁止
・内容を隠してクリックを誘導しない
・毎回同じテンプレートにしない
・自然な会話の余白を作る
・ニュースの重要性に応じて文章の温度感を変える

構造化されたJSONとして返してください。

hook と description の2項目だけを返してください。
`,
        },
        {
          role: "user",
          content: `
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
      ],
      temperature: 0.8,
      max_tokens: 220,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "x_post",
          strict: true,
          schema: {
            type: "object",
            properties: {
              hook: {
                type: "string",
              },
              description: {
                type: "string",
              },
            },
            required: ["hook", "description"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent =
      response.choices[0]?.message?.content?.trim() ?? "";

    console.log("OpenAI rawContent:", rawContent);
    console.log("OpenAI refusal:", response.choices[0]?.message?.refusal);

    let parsed: {
      hook: string;
      description: string;
    };

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error(
        "AIの構造化出力を解析できませんでした"
      );
    }

    const hook = cleanHook(parsed.hook);
    const description = cleanDescription(parsed.description);

    const tweet = `【${hook}】

${description}

${url}`;

    // 最終チェック
    if (
      tweet.includes('{"') ||
      tweet.includes('{"result"') ||
      tweet.includes('{"response"') ||
      tweet.includes('{"content"') ||
      tweet.includes('{"hook"') ||
      tweet.includes('{"description"')
    ) {
      throw new Error(
        "X投稿にJSON文字列が混入したため投稿を中止しました"
      );
    }

    return NextResponse.json({
      tweet,
      score,
      hook,
      description,
      intentUrl:
        "https://x.com/intent/post?text=" +
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
