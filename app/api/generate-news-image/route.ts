import { NextResponse } from "next/server";
import OpenAI from "openai";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type VisualPlan = {
  core_news: string;
  main_subject: string;
  secondary_subjects: string[];
  location: string;
  event: string;
  visual_symbol: string;
  character_role: string;
  composition: string;
  headline_element: string;
  color_direction: string;
  avoid: string[];
};

const toText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === "string").join("、");
  }
  return "";
};

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  if (typeof value === "string" && value.trim()) {
    return [value];
  }
  return [];
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const newsId = Number(body.newsId);

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
        content: true,
        category: true,
      },
    });

    if (!news) {
      return NextResponse.json(
        { error: "記事が見つかりません" },
        { status: 404 }
      );
    }

    /*
     * =========================================================
     * STEP 1
     * 記事を理解して「1枚のニュース漫画」の設計図を作る
     * =========================================================
     */

    const planner = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: `
あなたはAI NEWSジャパン専属の
「ニュース漫画ビジュアルディレクター」です。

記事を読んで、
そのニュースが画像だけでも伝わるように
1枚の漫画イラストの構成を設計してください。

最重要ルール：

1. 「何のニュースなのか」が最優先
2. 主役を必ず1つ決める
3. 補助要素は2〜4個まで
4. 記事に存在しない出来事を作らない
5. 意味のないAIロボットを出さない
6. genericな未来都市に逃げない
7. キャラクターを出す場合もニュースの意味を補強する役割にする
8. 記事に会社名、製品名、人物、場所、チームなどがある場合は具体的に使う
9. 数字がニュースの重要ポイントなら大きな視覚要素として使う
10. 1枚の画像として成立する構図にする

作画の方向性は、
「ジョジョを想起させる劇画・アメコミ的な迫力」
を強く意識してください。

ただし既存作品のキャラクターは使用せず、
完全オリジナルの人物・存在として設計します。

欲しい雰囲気：

・強烈な陰影
・太く鋭い線
・大胆なポージング
・極端なパース
・劇画的な人物
・ハーフトーン
・漫画的な集中線
・強いコントラスト
・アメコミポスターのような迫力
・高密度だが主役が明確

スタンドを思わせるオリジナル存在を使ってもよいですが、
ニュース内容と意味的につながる場合だけ使用してください。

例えばAIニュースなら、
AI・計算・半導体・データセンターなどを
象徴する存在として使えます。

サッカーなら、
スタンドではなく選手・対戦・スタジアムを優先します。

事故なら、
事故現場・車両・救急・原因などを優先します。

芸能なら、
人物・作品・ステージ・イベントなどを優先します。

結果は必ずJSONのみ。
`,
        },
        {
          role: "user",
          content: `
記事タイトル：
${news.title}

カテゴリ：
${news.category ?? "ニュース"}

記事概要：
${news.summary ?? ""}

記事本文：
${(news.content ?? "").slice(0, 15000)}

次のJSON形式で返してください。

{
  "core_news": "この記事のニュースを1文で説明",
  "main_subject": "画像の絶対的な主役",
  "secondary_subjects": [
    "補助要素1",
    "補助要素2",
    "補助要素3"
  ],
  "location": "ニュースの場所",
  "event": "実際に起きている出来事",
  "visual_symbol": "ニュースを象徴する具体物",
  "character_role": "人物やスタンド風存在を出す場合の役割",
  "composition": "画面全体の構図",
  "headline_element": "数字や短い言葉で強調すべき要素。不要なら空文字",
  "color_direction": "色の方向性",
  "avoid": [
    "絶対に入れてはいけない要素1",
    "絶対に入れてはいけない要素2"
  ]
}
`,
        },
      ],
    });

    const rawPlan =
      planner.choices[0]?.message?.content ?? "{}";

    let parsedPlan: Partial<VisualPlan> = {};

    try {
      parsedPlan = JSON.parse(rawPlan);
    } catch {
      console.error("画像構成JSON解析失敗:", rawPlan);
    }

    const visualPlan: VisualPlan = {
      core_news:
        toText(parsedPlan.core_news) || news.title,

      main_subject:
        toText(parsedPlan.main_subject) || news.title,

      secondary_subjects:
        toList(parsedPlan.secondary_subjects),

      location:
        toText(parsedPlan.location),

      event:
        toText(parsedPlan.event) ||
        news.summary ||
        news.title,

      visual_symbol:
        toText(parsedPlan.visual_symbol),

      character_role:
        toText(parsedPlan.character_role),

      composition:
        toText(parsedPlan.composition) ||
        "主役を画面中央に大きく配置する劇画的な構図",

      headline_element:
        toText(parsedPlan.headline_element),

      color_direction:
        toText(parsedPlan.color_direction) ||
        "ニュース内容に合わせた強いコントラスト",

      avoid:
        toList(parsedPlan.avoid),
    };

    /*
     * =========================================================
     * STEP 2
     * 絵コンテを画像生成AIへ渡す
     * =========================================================
     */

    const imagePrompt = `
Create a premium editorial manga illustration for
AI NEWSジャパン.

The image must visually communicate the actual news event.

IMPORTANT:
Do NOT make a generic AI illustration.
Do NOT simply illustrate the category.
Do NOT create random robots.
Do NOT create an unrelated handsome hero.

The viewer should be able to look at the image and understand
what the news is about.

========================
ACTUAL NEWS
========================

Title:
${news.title}

Category:
${news.category ?? "News"}

Summary:
${news.summary ?? ""}

Core news:
${visualPlan.core_news}

========================
VISUAL PLAN
========================

MAIN SUBJECT:
${visualPlan.main_subject}

SECONDARY SUBJECTS:
${visualPlan.secondary_subjects.join(", ")}

LOCATION:
${visualPlan.location}

EVENT:
${visualPlan.event}

VISUAL SYMBOL:
${visualPlan.visual_symbol}

CHARACTER ROLE:
${visualPlan.character_role}

COMPOSITION:
${visualPlan.composition}

IMPORTANT HEADLINE ELEMENT:
${visualPlan.headline_element}

COLOR DIRECTION:
${visualPlan.color_direction}

AVOID:
${visualPlan.avoid.join(", ")}

========================
VISUAL STORYTELLING
========================

The MAIN SUBJECT must dominate the composition.

Secondary elements should support the main subject,
not compete with it.

Show the actual environment where the event belongs.

Show the actual object, product, team, person,
building, technology, location or event whenever relevant.

If a number is central to the news,
make that number visually powerful.

The illustration should tell the story through:

OBJECTS
+
PEOPLE
+
LOCATION
+
ACTION
+
SCALE
+
DRAMA

rather than through a large amount of text.

========================
ART STYLE
========================

Strong Japanese dramatic manga / comic-book aesthetic.

Very strongly evoke the theatrical visual language
associated with classic JoJo-style dramatic manga:

- bold black ink
- extreme contrast
- heavy shadows
- cross-hatching
- halftone
- dramatic anatomy
- exaggerated poses
- powerful hands
- intense eyes
- sharp facial features
- dynamic foreshortening
- extreme perspective
- cinematic lighting
- dramatic rim light
- explosive composition
- manga speed lines when appropriate
- dense editorial illustration
- premium comic-book poster feeling

Do NOT copy any existing character.

All characters must be original.

If the story benefits from a supernatural
"stand-like" entity, create an ORIGINAL entity
that visually symbolizes the actual news.

The entity must never become a random robot.

========================
ARTICLE-SPECIFIC RULES
========================

Technology:
Show the actual technology, chip, server,
data center, device or infrastructure.

Business:
Show the actual company, product, transaction,
facility or business event.

Sports:
Show the actual teams, players, uniforms,
stadium and competitive action.

Entertainment:
Show the actual performer, work, stage or event.

Politics:
Show the actual political setting,
person, institution or event.

Accident/disaster:
Show the actual location, incident,
vehicles, damage and emergency context.

Food/consumer:
Show the actual product, restaurant,
food or incident.

The image must represent the EVENT,
not merely the category.

========================
TEXT
========================

Keep text minimal.

Use short readable labels only when they
help identify an important company, product,
location or number.

Do not fill the image with paragraphs.

Brand names such as Huawei or DeepSeek may appear
when they are essential to understanding the news.

========================
FINAL COMPOSITION
========================

Wide horizontal 3:2 editorial composition.

One dominant focal point.

Strong foreground.

Detailed middle ground.

Meaningful background.

No random decorative objects.

No stock illustration feeling.

No photorealistic appearance.

The final result should look like
a spectacular Japanese manga news cover,
while remaining faithful to the actual article.
`;

    const result = await openai.images.generate({
      model: "gpt-image-2",
      prompt: imagePrompt,
      size: "1536x1024",
      quality: "medium",
    });

    const base64 = result.data?.[0]?.b64_json;

    if (!base64) {
      throw new Error("画像データが取得できませんでした");
    }

    const buffer = Buffer.from(base64, "base64");

    const blob = await put(
      `news-images/${news.id}-${Date.now()}.png`,
      buffer,
      {
        access: "public",
      }
    );

    await prisma.news.update({
      where: { id: news.id },
      data: {
        image: blob.url,
      },
    });

    return NextResponse.json({
      success: true,
      image: blob.url,
      visualPlan,
    });
  } catch (error) {
    console.error("記事AI画像生成エラー:", error);

    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: "記事AI画像の生成に失敗しました",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
