import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const newsId = Number(
      searchParams.get("newsId")
    );

    if (!newsId) {
      return NextResponse.json(
        { error: "newsIdが必要です" },
        { status: 400 }
      );
    }

    console.log("[supplemental-info] DB検索開始", { newsId });

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

    console.log("[supplemental-info] DB検索完了", {
      found: !!news,
    });

    if (!news) {
      return NextResponse.json(
        { error: "記事が見つかりません" },
        { status: 404 }
      );
    }

    console.log("[supplemental-info] OpenAI開始", {
      newsId,
      title: news.title,
    });

    const response =
      await openai.responses.create({
        model: "gpt-5-mini",

        tools: [
          {
            type: "web_search",
          },
        ],

        input: `
あなたはAI NEWSジャパンのニュースリサーチ担当です。

以下のニュースについて、
読んだ人が「へぇ、それは知らなかった」と思える
面白い補足情報をWeb検索で探してください。

【ニュースタイトル】
${news.title}

【ニュース要約】
${news.summary ?? ""}

【カテゴリ】
${news.category ?? ""}

【重要な目的】
単なるニュースの説明ではなく、
ニュースの主役となる企業・人物・団体・出来事について、
人に話したくなるような意外な事実を探してください。

【探してよい情報】
・創業者や社長の意外な経歴
・趣味や好き嫌い
・企業の意外な過去
・昔の失敗や苦労
・面白い記録
・意外なランキング
・赤字や黒字などの業績
・ライバルとの意外な関係
・社会貢献活動
・歴史的な出来事
・ニュースの背景として面白い事実

【禁止】
・根拠のない噂
・SNSの憶測
・確認できないゴシップ
・誹謗中傷
・推測
・事実確認できない犯罪情報

【情報源の優先順位】
1. 公式サイト・公式発表・公的資料
2. 本人インタビュー・企業インタビュー
3. NHK・共同通信・時事通信・大手新聞・大手報道などの信頼できる報道
4. その他の信頼できる専門メディア
5. Wikipediaなどの二次情報は、他に確認できる情報源がない場合のみ補助的に使用

Wikipediaだけを根拠に、重要な人物情報や不祥事などを断定しないでください。

【重要】
必ずWeb検索で確認できた事実だけを使用してください。
同じ事実を複数の情報源で確認できる場合は、より一次情報に近いものを優先してください。

補足情報は最大2件。
必ず最初に「今回のニュースのコメント欄に置いたら最も読まれそうな情報」を1件選んでください。
1件目は必ず最も強い本命候補にしてください。
2件目は、1件目とは明確に違う切り口で、1件目に近いレベルの「へぇ」価値がある場合だけ返してください。
2件目が少しでも弱い、普通、説明的だと判断した場合は、1件目だけ返してください。

最終選定の優先順位：
1. 今回のニュースの主役・企業・人物に直接関係すること
2. 読んだ人が思わず「へぇ」「マジで？」と思う意外性
3. Xコメントとして自然に読めること
4. 情報源の信頼性

「面白さ」は真面目な情報だけに限定しません。
ただし、ニュースの主役から離れた周辺情報や、単に検索結果で見つかっただけの関連情報は優先しないでください。
役立つ情報、意外な事実、人物の小ネタ、思わず笑ってしまう実話の順で幅広く候補を探してください。
ただし、面白さより事実性を必ず優先してください。

「正しいが普通」「役立つが面白くない」情報は採用しないでください。
候補が1件しかない場合は1件だけ返してください。
候補が複数あっても、最も強い1件だけで十分なら1件だけ返してください。
2件返す場合は、両方とも今回のニュースの主役に直接関係する情報であること。
「1件目は人物ネタ、2件目は会社の意外な背景」のように切り口が違っていても構いませんが、ニュースとの関係が弱い情報を数合わせで追加しないでください。

本当に使える補足情報が見つからない場合は、無理に情報を作らず「results": []」を返してください。
「正しいけれど普通」「会社概要レベル」「コメント欄で読んでも特に面白くない」と判断される情報しかない場合も、resultsを空にしてください。

単なる会社概要、店舗数、所在地、一般的な説明など、ありふれた情報は原則として採用しないでください。
ニュースの主役に関する人物の意外な一面、過去の出来事、社名の由来、創業時のエピソード、意外な経歴、業績、社会貢献、過去の重要な出来事などを優先してください。

さらに、信頼できる情報源で確認できる場合は、少し笑える・意外すぎる・人に話したくなるような小ネタも積極的に探してください。
例：
・本人が語っている変わった趣味や苦手なもの
・印象的な癖やエピソード
・ユニークな発言
・意外な特技
・変わった経歴
・本人や関係者が語った面白い逸話
・「そんなことある？」と思うような実話

ただし、面白くするための創作、脚色、誇張、数字の盛り、比喩を事実として扱うことは禁止です。
「鼻の穴に500円玉が入る」などの具体的な面白ネタも、本人の発言・公式情報・信頼できる報道などで実際に確認できた場合だけ採用してください。

ニュースの内容と完全に無関係な雑学は採用しないでください。

それぞれ、Xのコメント欄にそのまま投稿できる自然でラフな文章にしてください。

文章は40〜120文字程度。
ニュース解説記事のような堅い書き方ではなく、普通の人がコメント欄で「これ意外と知られてないですよね」「実はこんな経歴なんです」と話すような自然なトーンにしてください。

「実は」「ちなみに」「意外にも」「知られていませんが」「この人、実は」など、書き出しは毎回同じにせず自然に変えてください。
毎回「実は」で始める必要はありません。

読んだ人が一瞬「へぇ」と思って、誰かに話したくなる情報を優先してください。
説明しすぎず、1つのコメントにつき1つの面白い事実に絞ってください。

宣伝文句、ニュース記事風の硬い表現、過度にセンセーショナルな表現は禁止です。
「驚きの事実」「衝撃の」「実はヤバい」など、煽る表現は使わないでください。

特に優先するもの：
・社長や人物の意外な経歴
・趣味、好き嫌い、意外な人物像
・企業の意外な過去
・創業時のエピソード
・社名やサービス名の由来
・意外な記録や実績
・過去の大きな転換点
・ニュースと直接つながる業績や経営事情
・意外な企業間の関係
・社会貢献や支援活動
・今回のニュースを理解するうえで意外と重要な背景

優先度を下げるもの：
・所在地
・店舗数
・一般的な会社概要
・誰でも知っている情報
・ニュース本文を言い換えただけの内容

今回のニュースとの関係が弱い単なる雑学は採用しないでください。

犯罪、逮捕、不祥事、脱税などの情報を使う場合は、信頼できる報道や公的情報で確認できる事実だけを使用してください。
「らしい」「〜と言われている」など、根拠が弱い情報は採用しないでください。

最も面白い補足情報が1件しかない場合は、1件だけ返してください。
無理に2件作らないでください。

最後に必ずJSONだけを返してください。

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
                    required: [
                      "text",
                      "sourceName",
                      "sourceUrl",
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: [
                "results",
              ],
              additionalProperties: false,
            },
          },
        },
      });

    console.log("[supplemental-info] OpenAI完了");

    const raw =
      response.output_text ?? "{}";

    let parsed: {
      results?: Array<{
        text?: string;
        sourceName?: string;
        sourceUrl?: string;
      }>;
    } = {};

    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        "補足情報の解析に失敗しました"
      );
    }

    const results =
      (parsed.results ?? [])
        .filter(
          (item) =>
            item.text &&
            item.sourceName &&
            item.sourceUrl
        )
        .slice(0, 2)
        .map((item) => ({
          text: item.text!.trim(),
          sourceName: item.sourceName!.trim(),
          sourceUrl: item.sourceUrl!.trim(),
        }));

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error(
      "補足情報取得エラー:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "補足情報の取得に失敗しました",
      },
      { status: 500 }
    );
  }
}
