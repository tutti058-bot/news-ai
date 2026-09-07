import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const newsId = Number(searchParams.get("newsId"));

    if (!newsId) {
      return NextResponse.json(
        { error: "newsIdが必要です" },
        { status: 400 }
      );
    }

    const news = await prisma.news.findUnique({
      where: { id: newsId },
      select: {
        id: true,
        title: true,
        summary: true,
        category: true,
      },
    });

    if (!news) {
      return NextResponse.json(
        { error: "記事が見つかりません" },
        { status: 404 }
      );
    }

    console.log("[supplemental-info] 主役抽出開始", {
      newsId,
      title: news.title,
    });

    // --------------------------------------------------
    // STEP 1
    // ニュースの「主役」だけを特定
    // --------------------------------------------------
    const subjectResponse = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `
以下のニュースから、ニュースの主役を特定してください。

タイトル：
${news.title}

要約：
${news.summary ?? ""}

カテゴリ：
${news.category ?? ""}

主役は「企業名・人物名・団体名・サービス名」のいずれか。
現在起きているニュースそのものではなく、
そのニュースに登場する主体を答えてください。

最大2個。
説明文は禁止。
JSONのみ。

{
  "subjects": ["主役1", "主役2"]
}
`,
      text: {
        format: {
          type: "json_schema",
          name: "news_subject",
          strict: true,
          schema: {
            type: "object",
            properties: {
              subjects: {
                type: "array",
                items: {
                  type: "string",
                },
                maxItems: 2,
              },
            },
            required: ["subjects"],
            additionalProperties: false,
          },
        },
      },
    });

    let subjects: string[] = [];

    try {
      const parsed = JSON.parse(subjectResponse.output_text || "{}");

      if (Array.isArray(parsed.subjects)) {
        subjects = parsed.subjects.filter(
          (value: unknown): value is string =>
            typeof value === "string" && value.trim().length > 0
        );
      }
    } catch {
      subjects = [];
    }

    const mainSubject = subjects[0] || "";

    console.log("[supplemental-info] 主役抽出結果", {
      newsId,
      subjects,
      mainSubject,
    });

    if (!mainSubject) {
      return NextResponse.json({ results: [] });
    }

    // --------------------------------------------------
    // STEP 2
    // 主役について「今回のニュースとは別の話」を検索
    // --------------------------------------------------
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",

      tools: [
        {
          type: "web_search",
          search_context_size: "low",
        },
      ],

      input: `
AI NEWSジャパンのXコメント用に、
ニュースの主役について「今回の記事とは別の面白い事実」を探してください。

【ニュースの主役】
${mainSubject}

【今回のニュース】
${news.title}

【ニュース要約】
${news.summary ?? ""}

【絶対条件】

今回のニュース内容を説明してはいけません。

今回のニュースに出てくる
製品・サービス・発表・機能・スペック・数字・出来事は、
補足情報として使わないでください。

「ニュース本文を読んだ人がすでに知っている情報」
も禁止です。

探す対象は、
${mainSubject} という企業・人物・団体・サービスそのものについての
「別の話」です。

【検索方向】

今回のニュースタイトルをそのまま検索しないでください。

代わりに主役について、

- 創業
- 歴史
- 創業者
- CEO
- 過去
- 社名の由来
- 意外な経歴
- 過去の転機
- 過去の失敗
- 意外な記録
- 別事業
- 意外な人物との関係
- 面白い実話
- 本人が語ったエピソード

などの方向からWeb検索してください。

検索結果が今回のニュースと同じ内容だった場合は捨ててください。

【理想】

例えばニュースが
「Microsoftの新しいAI製品」
だった場合、

悪い例：
「Microsoftの新AI製品は○○GBのメモリに対応」
→ 今回の記事の説明なのでNG

良い例：
「Microsoftは創業当初、IBMとの契約をきっかけにOS事業を大きく伸ばした」
→ 今回の記事とは別のMicrosoftの歴史なのでOK

このように、
「主役は同じだけど、ニュースとは別の話」
を探してください。

【採用基準】

1. 今回の記事本文と別の情報
2. 主役に直接関係
3. 「へえ」と思える
4. 事実確認できる
5. Xコメントとして読みやすい

ありふれた会社概要や所在地などは禁止。

噂・SNSの憶測・未確認情報は禁止。

一次情報、公式情報、本人発言、信頼できる報道を優先してください。

【文章】

40〜120文字程度。
60〜90文字程度を中心。

Xのコメント欄にそのまま置ける、
自然で読みやすいラフな文章にしてください。

文章は基本的に、

「具体的な事実。そこから感じる短い一言。」

の2文構成を優先してください。

1文目：
Web検索で確認できた具体的な事実を1つだけ書く。

2文目：
その事実について、
「へえ」「意外」「そんな過去があったのか」
と感じる程度の短い一言を添える。

2文目はニュース解説や長い感想にしない。
あくまでXコメントらしい自然な反応にする。

例えば、

「Microsoftのビル・ゲイツは学生時代、学校のコンピューターを自由に使うためにプログラムを書き換えていた。後のMicrosoft創業者につながる原点ともいえる話。」

のような形。

ただし、例文の内容自体を事実として使う必要はありません。
必ずWeb検索で確認してください。

【文章上の注意】

・「ハッカー」「天才」「伝説」など、強い言葉は情報源が明確に裏付けている場合だけ使用
・刺激的に見せるための誇張は禁止
・1文目に情報を詰め込みすぎない
・数字は本当に必要な場合だけ1つまで
・専門用語はできるだけ避ける
・会社概要のような説明文にしない
・ニュース本文の焼き直しに戻さない
・毎回「実は」で始めない
・毎回同じ語尾にしない

語尾は、
「〜だった」
「〜として知られている」
「〜が原点のひとつ」
「ここはちょっと意外」
「意外と知られてない話」
など、自然な言い切りを使う。

「です」「ます」「ですよね」「なんですよね」は使わない。

1件につき1つの事実だけ。

2件まで。
2件目は本当に強い別ネタがある場合だけ。

弱い情報を数合わせで追加しない。

使える情報がなければ results を空にする。

最後にJSONだけ返してください。

{
  "results": [
    {
      "text": "補足情報",
      "sourceName": "情報源の名前",
      "sourceUrl": "https://..."
    }
  ]
}
`,
      text: {
        format: {
          type: "json_schema",
          name: "supplemental_info",
          strict: true,
          schema: {
            type: "object",
            properties: {
              results: {
                type: "array",
                maxItems: 2,
                items: {
                  type: "object",
                  properties: {
                    text: {
                      type: "string",
                    },
                    sourceName: {
                      type: "string",
                    },
                    sourceUrl: {
                      type: "string",
                    },
                  },
                  required: ["text", "sourceName", "sourceUrl"],
                  additionalProperties: false,
                },
              },
            },
            required: ["results"],
            additionalProperties: false,
          },
        },
      },
    });

    console.log("[supplemental-info] OpenAI完了", {
      newsId,
      mainSubject,
    });

    let result;

    try {
      result = JSON.parse(response.output_text || "{}");
    } catch {
      return NextResponse.json({ results: [] });
    }

    if (
      !result ||
      !Array.isArray(result.results)
    ) {
      return NextResponse.json({ results: [] });
    }

    return NextResponse.json({
      results: result.results.slice(0, 2),
    });
  } catch (error) {
    console.error(
      "[supplemental-info] 補足情報取得エラー:",
      error
    );

    return NextResponse.json(
      {
        error: "補足情報の取得に失敗しました",
      },
      { status: 500 }
    );
  }
}
