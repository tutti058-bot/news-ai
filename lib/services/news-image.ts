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
  return "";
};

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (v): v is string => typeof v === "string"
    );
  }

  if (typeof value === "string" && value.trim()) {
    return [value];
  }

  return [];
};

export async function generateNewsImage(newsId: number) {
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
    throw new Error("記事が見つかりません");
  }

  /*
   * STEP 1
   * 記事を理解して画像の絵コンテを作る
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
ニュース漫画ビジュアルディレクターです。

記事を完全に理解し、
「画像だけを見ても何のニュースか分かる」
1枚のニュース漫画を設計してください。

最重要：

・主役を1つ決める
・補助要素は2〜4個
・記事の具体的な出来事を描く
・会社、製品、人物、場所、チームなどを具体的に使う
・重要な数字は視覚的に強調する
・記事にない出来事を作らない
・意味のないAIロボットを出さない
・genericな未来都市にしない

作画方向：

・日本の劇画漫画を思わせる強烈な表現
・ジョジョを想起させる大胆で theatrical なポージング
・太いインク線
・濃い陰影
・ハーフトーン
・大胆なパース
・強烈な表情
・アメコミポスターのような迫力
・「ゴゴゴゴ…」のような漫画的な効果音演出
・高密度だが主役は明確

人間キャラクターだけでなく、
人間の背後に立つ「スタンドを思わせる」
完全オリジナルの人型存在を使ってよい。

その存在は人間とは別の存在として、
ニュース内容を象徴する役割を持たせる。

ただし毎回必ず出すのではなく、
ニュースに合う場合だけ使用する。

既存作品のキャラクターは使用しない。
完全オリジナルのキャラクターとして設計する。

JSONのみ返してください。
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

以下のJSONを返してください。

{
  "core_news": "ニュースの核心を1文",
  "main_subject": "画像の主役",
  "secondary_subjects": [
    "補助要素1",
    "補助要素2",
    "補助要素3"
  ],
  "location": "場所",
  "event": "実際に起きた出来事",
  "visual_symbol": "ニュースを象徴する具体物",
  "character_role": "人間キャラクターとスタンド風存在の役割",
  "composition": "具体的な画面構成",
  "headline_element": "強調する数字や短い言葉",
  "color_direction": "色",
  "avoid": [
    "避けるもの1",
    "避けるもの2"
  ]
}
`,
      },
    ],
  });

  let plan: Partial<VisualPlan> = {};

  try {
    plan = JSON.parse(
      planner.choices[0]?.message?.content ?? "{}"
    );
  } catch {
    console.error("画像構成JSON解析失敗");
  }

  const visualPlan: VisualPlan = {
    core_news:
      toText(plan.core_news) || news.title,

    main_subject:
      toText(plan.main_subject) || news.title,

    secondary_subjects:
      toList(plan.secondary_subjects),

    location:
      toText(plan.location),

    event:
      toText(plan.event) ||
      news.summary ||
      news.title,

    visual_symbol:
      toText(plan.visual_symbol),

    character_role:
      toText(plan.character_role),

    composition:
      toText(plan.composition) ||
      "主役を大きく配置した劇画的構図",

    headline_element:
      toText(plan.headline_element),

    color_direction:
      toText(plan.color_direction) ||
      "強いコントラスト",

    avoid:
      toList(plan.avoid),
  };

  /*
   * STEP 2
   * 絵コンテを画像生成AIへ渡す
   */
  const imagePrompt = `
Create a spectacular wide editorial manga illustration
for AI NEWSジャパン.

The image MUST communicate the actual news event.

NEWS:
${news.title}

SUMMARY:
${news.summary ?? ""}

CORE NEWS:
${visualPlan.core_news}

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

IMPORTANT HEADLINE:
${visualPlan.headline_element}

COLOR:
${visualPlan.color_direction}

AVOID:
${visualPlan.avoid.join(", ")}

STYLE:

Create an original, extremely dramatic Japanese
manga/comic editorial illustration.

Use the visual language of intense classic Japanese
battle manga and theatrical comic-book posters:

- bold black ink
- heavy shadows
- cross-hatching
- halftone
- dramatic anatomy
- exaggerated poses
- powerful hands
- intense eyes
- extreme foreshortening
- cinematic lighting
- sharp highlights
- explosive perspective
- dynamic speed lines
- dramatic clouds
- high contrast
- rich gold, purple, blue, red and black tones
- dense manga panel-like composition

MANDATORY SOUND EFFECT:

Always include a large, highly visible Japanese manga sound effect:

「ゴゴゴゴゴ……」

The sound effect MUST appear in every generated image.
Do NOT omit it.
Place it dramatically in the background or around the main subject.
Use oversized lettering, warped perspective, thick black ink,
strong shadow, halftone texture and comic-book impact styling.

The overall image MUST strongly resemble a premium Japanese
battle-manga / American comic-book news poster.

MANDATORY VISUAL STYLE:
- extremely thick black ink outlines
- aggressive brush-ink texture
- hard cel shading
- dense cross-hatching
- strong halftone dots
- extreme perspective
- dramatic foreshortening
- exaggerated anatomy and poses
- intense facial expressions
- powerful hands
- explosive speed lines
- radial impact lines
- comic-book burst shapes
- deep black shadows
- vivid red, blue, gold and black
- large graphic typography
- theatrical comic-book cover composition
- visually dense background
- strong foreground/background separation

Do NOT make the image look like a soft anime illustration,
generic AI art, realistic photography, or a simple character portrait.

CHARACTER DESIGN:

If a human character is useful,
create an original charismatic manga character.

Behind or beside that character,
a separate ORIGINAL humanoid supernatural entity
may appear.

The entity must clearly look like a separate being:

- humanoid silhouette
- powerful athletic anatomy
- distinctive armor or costume
- supernatural presence
- dramatic eyes
- unusual mechanical/organic details
- theatrical pose
- strong visual identity

It must NOT look like a normal human.
It must NOT look like a generic robot.

The human and the supernatural entity
must have different silhouettes.

The entity should visually symbolize the news.

NEWS SPECIFICITY:

Technology:
show the actual chip, hardware, servers,
data center and infrastructure.

Business:
show the actual company, product,
facility or transaction.

Sports:
show actual teams, players, uniforms,
stadium and competitive action.

Entertainment:
show the performer, work, stage or event.

Politics:
show the political setting, person,
institution or event.

Accident:
show the actual location, vehicles,
damage and emergency situation.

Food/consumer:
show the actual product, food,
restaurant or incident.

The actual event is more important than decoration.

Do not create random robots.

Do not create a generic futuristic city.

Do not make the human character
the subject unless the article is about that person.

Do not overload the image with text.

Use short readable labels only when they
help identify the actual company, product,
place or important number.

Wide horizontal 3:2 composition.
Premium manga-news-cover quality.
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

  return blob.url;
}
