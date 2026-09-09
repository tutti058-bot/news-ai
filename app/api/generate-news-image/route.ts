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
10. 1枚の画像として成立する構図にする

作画の方向性は、
「ジョジョを想起させる劇画・アメコミ的な迫力」
を強く意識してください。

人物がニュースの意味を補強する場合は、
ジョジョシリーズのような劇画的で個性的なキャラクター表現を使用してください。

さらに、ニュース内容を視覚的に象徴できる場合は、
スタンドを思わせる超常的な存在を登場させてください。

スタンド風の存在はニュースごとにデザインを変え、
実際のニュース内容を象徴するものにしてください。

例：
AI・半導体 → チップ、回路、データを象徴する存在
スポーツ → ボール、選手、競技を象徴する存在
企業・商品 → 製品やサービスを象徴する存在
事故・災害 → 現場や原因を象徴する存在

ただし、スタンド風の存在がニュースを分かりにくくする場合は使用しないでください。

キャラクターやスタンドだけで画面を埋めず、
必ずニュースの実物・場所・出来事を主役として見せてください。

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

Strong Japanese dramatic manga aesthetic
combined with American comic-book visual energy.

Desired visual language:

- extremely dramatic anatomy
- powerful poses
- intense facial expressions
- sharp eyes
- expressive hands
- elaborate costumes
- extreme foreshortening
- exaggerated perspective
- thick black ink
- strong contour lines
- deep shadows
- cross-hatching
- halftone texture
- dramatic rim lighting
- vivid comic-book colors
- cinematic composition
- powerful American comic-book poster feeling

The overall feeling should be:
dramatic Japanese manga + gritty gambling-manga intensity + American comic-book poster energy.

Use the actual characters, objects, products,
locations and events required to explain the news.

Do not turn the image into a generic superhero poster.
The real news must remain the main subject.

========================
CHARACTER PRIORITY
========================

If the article is about a real identifiable person,
and reliable visual information about that person is
available in the article context or source material,
make that person the primary human subject.

Preserve recognizable characteristics such as:
- face shape
- hairstyle
- hair color
- approximate age
- clothing
- expression
- distinctive visual features

Do not replace a clearly identifiable person with
a generic fictional-looking person.

Transform the presentation into an extremely dramatic
Japanese manga aesthetic with gritty seinen and gambling-manga
intensity.

Use:
- theatrical poses
- exaggerated but believable anatomy
- powerful hands
- extreme facial expressions
- dramatic head angles
- extreme foreshortening
- striking silhouettes
- hard directional lighting
- deep shadows
- heavy ink
- cross-hatching
- halftone
- explosive perspective
- intense reaction effects

The person should still be recognizable while the
overall presentation becomes highly stylized.

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

Keep text almost completely out of the image.

Use a SMALL AMOUNT of readable Japanese text
to make the news understandable from the image alone.

Include 1 to 2 short editorial text elements
when they materially improve comprehension.

Examples:
「日本初」
「全国展開」
「新型チップ発表」
「○○を発表」
「9月中旬から導入」

The text must summarize the actual news.
Do not invent information.

Text should be short, bold and integrated into
the composition like a premium manga news cover.

Do NOT create speech bubbles.

Do NOT create dialogue.

Do NOT create long explanatory paragraphs.

Do NOT create bottom CTA banners.

Do NOT create:
"続きはリプライ"
"詳細はこちら"
"コメントして"
"フォローして"

Do NOT fill the image with text.

Do NOT create comic panels unless the actual news
requires multiple locations or a confrontation.

Small real-world logos and product names are allowed
when essential to identifying the subject.

MANGA SOUND EFFECTS:

When they enhance the scene, use dramatic Japanese
manga sound effects such as:

「ゴゴゴゴゴ…」
「ドドドドド…」
「ドン！」
「ズズズ…」
「バァーン！」

Choose the sound effect according to the mood and action.

Heavy, ominous or powerful news:
「ゴゴゴゴゴ…」

Sudden movement, escalation or energetic scenes:
「ドドドドド…」

Major reveal or impactful moment:
「ドン！」
「バァーン！」

These sound effects should be integrated naturally
into the artwork as stylized manga lettering.

Do not use them mechanically in every image.
Do not let sound effects cover the main subject
or important news-identifying text.

The image itself must communicate the news event,
with short editorial text and manga sound effects
acting only as visual support.

========================
YANI NEKO / REACTION CHARACTER
========================

Add the recurring AI NEWSジャパン mascot character,
a small adult cat-eared woman called ヤニねこ.

IMPORTANT:
The character name "ヤニねこ" must NEVER appear as visible text
inside the generated image.

The mascot itself should be visually consistent across articles:

- small adult woman
- youthful, childish-looking face while clearly adult
- blue-toned ash-colored permed bob haircut
- cat ears
- cat tail
- oversized stretched and slightly worn white NEKO T-shirt
- loose sweatpants
- barefoot
- often holding or smoking a cigarette
- expressive, slightly foolish and chaotic personality

The mascot is NOT the main subject of the news.

The ACTUAL NEWS must remain the dominant visual.

ヤニねこ exists to visually represent the reader's emotional
reaction to the news.

Use extremely exaggerated reactions inspired by gritty
Japanese gambling manga and dramatic seinen manga:

- shock: huge eyes, white eyes, sweat, mouth wide open
- panic: trembling, sweating, chaotic pose
- anger: furious face, veins, explosive gesture
- excitement: intense grin, eyes wide open, leaning forward
- joy: arms raised, ecstatic expression
- despair: pale face, collapsed posture
- confusion: blank or crossed eyes, sweat
- disbelief: frozen expression, exaggerated shock
- smugness: ridiculous confident grin
- exhaustion: slumped posture, cigarette hanging from mouth

The reaction should be LARGE and visually memorable.

Use dramatic manga effects when appropriate:
speed lines, impact lines, sweat drops, shaking effects,
heavy shadows, extreme close-ups, dramatic perspective,
and large expressive gestures.

Do NOT use the same pose or facial expression in every image.

Choose the reaction based on the actual news.

The mascot may be:
- large in the foreground
- beside the main subject
- reacting in the background
- partially visible
- small in a corner

Choose the placement that best preserves news comprehension.

The mascot must never replace the actual product,
person, team, company, location, event or technology
that the article is about.

========================
AI NEWSジャパン BRANDING
========================

Include the brand name:

「AI NEWSジャパン」

Use it as a small, clean editorial brand mark or title element.

Do NOT write:
「ヤニねこ」
"YANI NEKO"
or any other mascot name.

Do not make the branding larger than the main news subject.

The brand should feel naturally integrated into a premium
manga news cover.

========================
NEWS EXPLANATION TEXT
===============================================
NEWS EXPLANATION TEXT
========================

The image should be understandable even without
reading the X post.

Add 1 to 2 short Japanese news-identifying text elements
when they improve comprehension.

Examples:
「日本初」
「全国展開」
「9月中旬から導入」
「新型チップ発表」
「○○が発表」

Keep each text element very short.

Use only information that actually appears in the article.

Do not create long sentences.

Do not create speech bubbles.

Do not create dialogue.

Do not create paragraphs.

Integrate the short text naturally into the artwork
as dramatic manga editorial lettering.

The text should support the image,
not become the main visual.

========================
FINAL COMPOSITION
========================

Wide horizontal 3:2 editorial composition.

ONE SINGLE SCENE.

One dominant focal point.

Show the actual news event clearly.

Use:
main subject
+
relevant people or characters
+
actual environment
+
meaningful action

The main subject should occupy a large portion
of the frame.

Strong foreground.
Detailed middle ground.
Meaningful background.

Place short news-identifying text naturally
into the composition without turning the image
into an infographic.

The main subject and event must remain dominant.

No random decorative objects.

No generic futuristic city.

No stock illustration feeling.

No photorealistic appearance.

No split comic panels.

The final result should feel like a spectacular,
high-impact Japanese dramatic manga cover fused with
a powerful American comic-book poster and exaggerated
gambling-manga reactions, while remaining faithful to
the actual article.
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
