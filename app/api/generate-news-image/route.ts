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
Create a high-quality editorial manga illustration for
AI NEWSジャパン.

The image must turn the ACTUAL NEWS into a visually memorable
single-scene manga illustration.

The core concept is:

"An actual news story experienced and reacted to by
a cute recurring character."

The image must NOT feel like a corporate infographic
with a mascot added afterward.

It must feel like one coherent manga scene.

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
NEWS ACCURACY
========================

The actual news is the foundation of the illustration.

Clearly show the real subject of the article:
- actual product
- actual technology
- actual company
- actual person when relevant
- actual team
- actual location
- actual vehicle
- actual event
- actual device
- actual service
- actual visual symbols

Do not replace the real subject with a generic version.

Do not invent important facts.

Do not create unrelated objects.

If the article concerns a recognizable product,
device, company or service, make it visually recognizable.

The viewer should understand the basic news
from the image without reading the article.

========================
YANI NEKO - FIXED CHARACTER DESIGN
========================

Add the recurring AI NEWSジャパン mascot character,
ヤニねこ.

IMPORTANT:

ヤニねこ is an ADULT WOMAN.

She is:
- petite
- cute
- youthful-looking
- slightly childish in personality
- clearly adult in appearance and body proportions

She must NEVER look like a child.

Her cuteness comes from her face, personality,
expressions and behavior.

FIXED APPEARANCE:

- small petite adult woman
- cute youthful anime face
- soft rounded face
- large golden / amber cat-like eyes
- blue-tinted pale ash-gray hair
- fluffy permed bob haircut
- triangular cat ears
- fluffy cat tail
- small cute nose and mouth
- cute anime proportions
- adult body proportions

FIXED CLOTHING:

- oversized stretched slightly worn white T-shirt
- simple black cat illustration on the shirt
- the word "NEKO" may appear on the shirt
- loose dark blue-gray sweatpants
- barefoot

The character must look like the SAME CHARACTER
in every article.

Do NOT redesign her.

Do NOT change her hairstyle.

Do NOT change her hair color.

Do NOT change her eye color.

Do NOT change her cat ears.

Do NOT remove her cat tail.

Do NOT change her basic clothing.

Do NOT make her photorealistic.

Do NOT make her look like a real human model.

Do NOT make her glamorous.

Do NOT make her muscular.

Do NOT make her look like a child.

Do NOT use realistic human facial proportions.

Keep her cute anime appearance even during
extreme comedic reactions.

========================
YANI NEKO EMOTIONAL DIRECTION
========================

FIRST understand the actual news.

Then determine the natural emotional reaction
a reader would have.

Then choose:

- facial expression
- eye expression
- mouth expression
- pose
- body language
- action
- interaction
- reaction intensity
- optional prop

The emotion MUST come from the actual article.

Do NOT make her surprised every time.

Do NOT repeat the same expression in every image.

Possible emotions:

- excitement
- curiosity
- happiness
- admiration
- confusion
- disbelief
- irritation
- anger
- disappointment
- sadness
- anxiety
- fear
- amusement
- laughter
- boredom
- exhaustion
- relief
- smugness
- surprise when genuinely appropriate

========================
EMOTION EXAMPLES
========================

NEW PRODUCT / EXCITING ANNOUNCEMENT:

Use:
sparkling eyes,
big smile,
leaning forward,
holding or examining the product,
excited body language.

Do not automatically use shock.

========================

NEW AI / TECHNOLOGY:

Use:
curious eyes,
leaning toward a screen,
holding a smartphone,
typing,
examining a device,
interested expression,
coffee nearby when appropriate.

========================

PRICE INCREASE:

Use:
empty wallet,
receipt,
price tag,
counting coins,
holding her head,
collapsed posture,
angry or devastated expression.

========================

SECURITY PROBLEM / VULNERABILITY:

Use:
worried eyes,
nervous expression,
looking at a warning screen,
backing away,
holding her head,
concerned posture.

Do not make this celebratory.

========================

SPORTS VICTORY:

Use:
jumping,
raising both arms,
cheering,
clapping,
fist pump,
huge happy expression.

========================

SPORTS DEFEAT:

Use:
slumped posture,
staring blankly at the scoreboard,
drooping ears,
holding her head,
sad or disappointed expression.

========================

ACCIDENT / DISASTER:

Use:
concern,
fear,
sadness,
subdued shock,
watching from an appropriate safe position.

Keep the event respectful.

Do NOT turn tragedy into comedy.

========================

SCANDAL / CONTROVERSY:

Use:
deadpan expression,
annoyed eyes,
crossed arms,
smoking while staring at the news,
rubbing her forehead,
disbelief.

========================

FUNNY / STRANGE NEWS:

Use:
ridiculous facial expression,
confused eyes,
laughing,
falling over,
pointing,
deadpan reaction,
or exaggerated comedic behavior.

========================

ORDINARY NEWS:

Use:
small natural reaction.

Examples:
- drinking coffee
- smoking
- looking at a phone
- sitting lazily
- sleepy expression
- mildly curious expression

Do NOT force a huge reaction into ordinary news.

========================
CUTE FACE + EXTREME REACTION
========================

The BASE CHARACTER must remain cute.

When the emotion becomes intense,
the expression may become extremely exaggerated.

Possible exaggerated manga expressions:

- huge eyes
- tiny pupils
- sparkling eyes
- watery eyes
- huge open mouth
- trembling mouth
- puffed cheeks
- sweat drops
- blushing
- flattened ears
- raised ears
- crossed eyes
- uneven eyes
- shocked face
- exhausted face

The face may become ridiculous,
but it must remain recognizable as the same cute
anime adult woman.

The visual principle is:

CUTE
+
EXTREME EMOTIONAL REACTION
=
YANI NEKO

========================
ACTION AND INTERACTION
========================

ヤニねこ should interact with the actual news.

Do NOT simply place her standing beside the subject.

Whenever possible:

- hold the product
- look at the product
- touch the device
- stare at a monitor
- react to a price
- hold a wallet
- hold a smartphone
- point at the news
- hide behind something
- grab her head
- celebrate
- collapse
- run
- sit
- lie down
- drink coffee
- smoke
- stare blankly
- laugh
- react directly to another character

The action should explain her emotional relationship
to the news.

========================
CHARACTER SCALE
========================

Do NOT automatically make ヤニねこ tiny.

Choose the scale according to the story.

She may be:

- large foreground character
- medium character
- small background character
- partially visible
- sitting in the foreground
- interacting with the main subject

When the reaction is the visual hook,
ヤニねこ may occupy a large portion of the image.

The actual news must still remain clearly understandable.

========================
MULTIPLE YANI NEKO
========================

When it improves the manga storytelling,
two or more versions of the SAME ヤニねこ may appear.

For example:

Large ヤニねこ:
extreme reaction.

Small ヤニねこ:
calmly drinking coffee.

Or:

Large ヤニねこ:
excited about a new product.

Small ヤニねこ:
sleeping because she is exhausted.

Use this selectively.

Do NOT create multiple unrelated character designs.

Every version must clearly be the same character.

========================
SPEECH BUBBLES
========================

Speech bubbles ARE allowed.

Use them when they improve the manga storytelling.

Character speech should be short and natural.

Examples:

「え!?」
「マジかよ!?」
「これ便利じゃん!!」
「またかよ…」
「高っ!!」
「なんで!?」
「やば…」
「これは欲しい」
「ちょっと待って!?」
「ふーん」
「なるほど…」
「まずはコーヒー…」

Keep dialogue approximately 2 to 12 Japanese characters
when possible.

The dialogue must represent ヤニねこ's reaction
to the actual news.

Do NOT use dialogue to explain the whole article.

Do NOT invent facts.

Do NOT create long paragraphs.

Do NOT create promotional CTAs.

Do NOT write:
「続きはサイトへ」
「詳細はこちら」
「フォローして」
「コメントして」

Do NOT display the character name.

========================
EDITORIAL NEWS TEXT
========================

Short factual editorial text is allowed.

Use only facts contained in the article.

Keep it short.

Examples:

「日本初」
「新型AI発表」
「全国展開」
「9月から導入」
「大幅値上げ」

Do not turn the image into an infographic.

Character speech and editorial news text
should be visually distinct.

========================
MANGA EFFECTS
========================

Use manga visual effects when appropriate:

- speed lines
- impact lines
- sweat
- trembling lines
- dramatic shadows
- expressive motion
- stylized Japanese sound effects
- dynamic perspective
- exaggerated reaction marks

Possible sound effects:

「ドン！」
「ゴゴゴゴ…」
「ドドドド…」
「バァーン！」

Do NOT use sound effects mechanically.

Do NOT let effects cover important news information.

========================
VISUAL STYLE
========================

Use a polished Japanese manga / anime editorial style.

The image should be:

- highly expressive
- colorful
- dynamic
- cleanly illustrated
- visually rich
- humorous when appropriate
- dramatic when appropriate
- cute
- energetic
- cinematic

Use bold manga linework and strong visual composition.

Avoid overly realistic rendering.

Avoid photorealism.

Avoid realistic human faces.

Avoid gritty realistic human anatomy.

Avoid excessive American comic-book styling.

Avoid superhero-poster aesthetics.

Avoid JoJo-style character design.

Do NOT use Stand-like supernatural characters.

Do NOT create a generic superhero.

The drama should come from:
composition,
facial expressions,
poses,
objects,
perspective,
manga effects,
and the actual news.

========================
COMPOSITION
========================

Create ONE coherent scene.

Do NOT create unrelated panels.

The image may have the visual density
of a manga page while remaining one unified scene.

Create strong visual hierarchy:

ACTUAL NEWS
+
YANI NEKO REACTION
+
OPTIONAL SPEECH BUBBLE
+
MANGA EFFECTS
+
OPTIONAL SECONDARY COMEDIC BEAT

The viewer should understand:

1. What happened.
2. What the news is about.
3. How ヤニねこ feels about it.

The composition should have visual rhythm.

Avoid sterile corporate infographic layouts.

Avoid placing ヤニねこ automatically in one corner.

Avoid making her look pasted onto the artwork.

Integrate her into the environment using:

- perspective
- overlap
- lighting
- shadows
- interaction
- scale
- environmental details

========================
AI NEWSジャパン BRANDING
========================

Include:

「AI NEWSジャパン」

as a small clean editorial brand mark.

The brand should be visible but secondary.

IMPORTANT:

Never write:

「ヤニねこ」
"YANI NEKO"

or any other mascot name.

The character is identified only by her consistent appearance.

========================
FINAL QUALITY
========================

The final image should feel like:

A funny, dramatic, highly polished Japanese manga
created specifically for AI NEWSジャパン.

It should NOT feel like:

- a stock illustration
- a generic AI image
- a corporate infographic
- a mascot pasted onto a news image
- a superhero poster
- a realistic movie still

The actual news must remain accurate.

ヤニねこ must remain cute, adult, recognizable,
and visually consistent.

Her emotional reaction should change naturally
from article to article.

Make the image visually surprising,
memorable and entertaining while preserving
the meaning of the news.
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
