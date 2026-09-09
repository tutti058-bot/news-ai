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
a cute anime-style adult cat-eared woman called ヤニねこ.

IMPORTANT CHARACTER CONSISTENCY:

The appearance of ヤニねこ must remain extremely consistent
across every article.

Use the following character design as a FIXED CHARACTER MODEL:

- clearly adult woman
- short, petite body
- youthful, childish-looking face while clearly adult
- cute anime facial proportions
- soft, rounded face
- large golden / amber cat-like eyes
- blue-tinted pale ash-gray hair
- fluffy permed bob haircut
- distinctive triangular cat ears matching the hair
- soft fluffy cat tail
- small, cute nose and mouth
- slender but natural adult body
- expressive anime-style face

CLOTHING MUST REMAIN CONSISTENT:

- oversized stretched, slightly worn white T-shirt
- simple black cat illustration on the shirt
- the word "NEKO" may appear on the shirt
- loose dark blue-gray sweatpants
- barefoot

The character should look like the SAME CHARACTER
from article to article.

Do NOT redesign the character.

Do NOT change the hairstyle.

Do NOT change the hair color.

Do NOT change the eye color.

Do NOT make the character realistic.

Do NOT make the character photorealistic.

Do NOT make the character look like a real human model.

Do NOT give the character a mature glamorous fashion-model appearance.

Do NOT turn the character into a gritty realistic manga woman.

The mascot must remain a cute anime character even when
her emotional reaction is extremely exaggerated.

The NEWS WORLD may use dramatic gritty manga rendering,
but ヤニねこ itself should retain a cute anime appearance.

========================
REACTION DIRECTION
========================

FIRST understand the actual news and determine:

1. What happened?
2. How important is it?
3. What emotional feeling would a reader naturally have?
4. What would ヤニねこ physically DO when reacting to it?

Then create ヤニねこ's:
- facial expression
- eye expression
- mouth expression
- body language
- pose
- action
- interaction with the news
- optional props or small objects

The reaction must be specifically connected to the article.

IMPORTANT:
Do NOT automatically make ヤニねこ surprised.

Do NOT use the same pose, emotion or action repeatedly.

The character design remains FIXED.
Her emotion, pose, action and situation change according
to the actual news.

========================
EMOTION + ACTION MATCHING
========================

POSITIVE / EXCITING NEWS:

Possible actions:
- leaning toward the new product
- holding the product excitedly
- looking at a screen with sparkling eyes
- raising both hands
- jumping slightly
- clapping
- hugging a pillow or object in excitement

Expression:
bright eyes, happy smile, excitement.

========================

NEW TECHNOLOGY / AI:

Possible actions:
- staring closely at a monitor
- holding a smartphone
- typing rapidly
- leaning forward with curiosity
- comparing two screens
- coffee beside the keyboard

Expression:
curious, fascinated, impressed, slightly overwhelmed.

========================

PRICE INCREASE / BAD DEAL:

Possible actions:
- staring at an empty wallet
- counting coins
- holding a receipt
- clutching her head
- collapsing onto a desk
- angrily pointing at a price tag

Expression:
shock, anger, despair or disbelief.

========================

SECURITY / CYBER / VULNERABILITY:

Possible actions:
- staring nervously at a computer
- backing away from a warning screen
- covering her mouth
- holding her head
- cautiously touching a keyboard
- looking worriedly at a security alert

Expression:
anxiety, concern, fear or confusion.

Do NOT make this type of news look celebratory.

========================

SPORTS / VICTORY:

Possible actions:
- jumping in celebration
- raising both arms
- waving a towel
- cheering toward the stadium
- clenching fists in excitement

Expression:
joy, excitement, amazement.

========================

SPORTS / DEFEAT:

Possible actions:
- lying face-down
- staring blankly at the scoreboard
- holding her head
- sitting with drooping ears

Expression:
disappointment, sadness or disbelief.

========================

ACCIDENT / DISASTER:

Possible actions:
- looking toward the incident from a safe distance
- covering her mouth
- holding her chest
- standing frozen
- anxiously watching emergency vehicles

Expression:
concern, fear, sadness or shock.

Keep the reaction respectful.
Do NOT make tragedy comedic.

========================

SCANDAL / CONTROVERSY / OUTRAGE:

Possible actions:
- smoking while giving a deadpan stare
- crossing her arms
- pointing accusingly
- looking at her phone with disbelief
- rubbing her forehead

Expression:
irritation, disbelief, anger or exhausted sarcasm.

========================

FUNNY / STRANGE / ABSURD NEWS:

Possible actions:
- laughing uncontrollably
- falling over
- pointing at the strange event
- holding her stomach
- staring blankly in disbelief

Expression:
comedic confusion, amusement, laughter or deadpan disbelief.

Keep the character cute even when the reaction is ridiculous.

========================

BUSINESS / PRODUCT ANNOUNCEMENT:

Possible actions:
- examining the product
- comparing products
- holding a smartphone
- looking at a price tag
- drinking coffee while watching the announcement
- reacting to a presentation screen

Choose the action based on whether the announcement
is positive, negative, surprising or ordinary.

========================

ORDINARY / ROUTINE NEWS:

Possible actions:
- drinking coffee
- scrolling on her phone
- sitting lazily
- smoking while looking at the news
- lying down
- giving a small uninterested glance

Expression:
relaxed, sleepy, mildly curious or deadpan.

Do NOT force an exaggerated reaction.

========================

POSITIVE BUT SERIOUS NEWS:

Possible actions:
- quietly watching the announcement
- holding her hands together
- looking relieved
- gently smiling
- thoughtfully examining the information

Use restrained emotion.

========================

SERIOUS NEWS:

The reaction must respect the seriousness of the subject.

Use:
- concerned posture
- subdued expression
- worried eyes
- quiet sadness
- restrained shock

Avoid silly props and exaggerated comedy.

========================
CONTEXTUAL PROP RULE
========================

Optional props may be used when they naturally connect
to the article.

Examples:

technology:
smartphone, laptop, monitor, keyboard, server display

money:
wallet, coins, receipt, price tag, calculator

sports:
ball, jersey, scoreboard, stadium item

food:
plate, drink, menu, shopping bag

travel:
suitcase, ticket, map, vehicle

business:
document, product package, smartphone, presentation screen

security:
warning screen, laptop, security alert

Use only props that make sense for the actual article.

Do NOT add random decorative objects.

========================
CHARACTER INTERACTION
========================

ヤニねこ should feel like a real character
living inside the news illustration.

Do NOT simply place the character beside the news.

Whenever possible, make ヤニねこ physically interact
with the situation.

Possible interactions include:

- looking directly at the important object
- holding the product
- touching a device
- staring at a monitor
- holding a phone showing the news
- reacting to a price tag
- holding a wallet
- running away from something
- hiding behind an object
- pointing at something
- grabbing her head
- celebrating
- falling over
- sitting on the floor
- lying down
- drinking coffee
- smoking while watching the event
- sleeping while the news happens around her
- being surrounded by the consequences of the news

The interaction should make the viewer immediately understand
HOW ヤニねこ feels about the news.

========================
CHARACTER SCALE
========================

The size of ヤニねこ should be decided by the composition.

Possible compositions:

1. LARGE FOREGROUND REACTION

Use when the emotional reaction is important.

ヤニねこ may occupy 25% to 45% of the image.

Use:
- huge facial expression
- dynamic pose
- extreme perspective
- expressive hands
- strong foreground placement

The news remains clearly visible behind or around her.

2. MEDIUM CHARACTER

Use for normal news.

ヤニねこ appears naturally beside or within
the main event while interacting with it.

3. SMALL COMEDIC CHARACTER

Use when a small reaction creates better comedy.

For example:
- sleeping in the corner
- drinking coffee
- staring blankly
- lying on a desk

Small does NOT mean insignificant.
The character should still have a clear narrative purpose.

4. MULTIPLE YANI NEKO REACTIONS

When it improves the storytelling, use two or more
versions of the SAME character at different scales.

Example:

Large ヤニねこ:
extreme emotional reaction to the headline.

Small ヤニねこ:
calmly drinking coffee or sleeping.

Another possible combination:

Large ヤニねこ:
holding the new product excitedly.

Small ヤニねこ:
looking exhausted by the number of new products.

This technique should be used selectively.

Do NOT create multiple unrelated character designs.

Every ヤニねこ must clearly be the same character.

========================
COMPOSITION RELATIONSHIP
========================

Think of the image as a SINGLE NEWS MANGA SCENE.

Do NOT think:

"Draw the news, then add a mascot."

Instead think:

"Create a dramatic news manga scene in which
ヤニねこ is naturally reacting to the event."

The news environment and ヤニねこ should visually
belong to the same scene.

Examples:

TECHNOLOGY:

A giant monitor or device dominates the environment.
ヤニねこ leans toward it, touches it, examines it,
or reacts dramatically to what appears on the screen.

PRICE INCREASE:

A huge price tag dominates the scene.
ヤニねこ holds an empty wallet or receipt,
looking devastated.

SPORTS:

The stadium, player and scoreboard create the main scene.
ヤニねこ reacts from the foreground, cheering,
crying, jumping or collapsing depending on the result.

ACCIDENT:

The actual location, vehicles and emergency context
remain visible.
ヤニねこ watches from an appropriate position,
looking worried or shocked.

FUNNY NEWS:

The event itself remains recognizable,
while ヤニねこ may have an absurdly exaggerated reaction.

BUSINESS:

The actual product, company environment or announcement
remains visible.
ヤニねこ interacts with the product or watches
the announcement.

========================
VISUAL STORYTELLING
========================

The viewer should be able to understand two things
at the same time:

1. What happened in the news.
2. How ヤニねこ feels about it.

The image should work as a miniature manga scene.

Use:
- foreground reaction
- middle-ground news subject
- background environment
- meaningful props
- dynamic perspective
- expressive body language
- dramatic visual effects

Do NOT make the character look pasted onto the image.

Do NOT make the character look like a sticker.

Do NOT isolate the character from the environment.

Integrate her naturally through:
- overlapping objects
- perspective
- lighting
- shadows
- environmental effects
- interaction with props
- appropriate scale

========================
COMEDIC CHARACTER STORYTELLING
========================

When appropriate, use visual contrast.

Examples:

A huge dramatic news event
+
small ヤニねこ casually drinking coffee.

A minor problem
+
massively exaggerated ヤニねこ reaction.

Exciting announcement
+
ヤニねこ staring at the screen with sparkling eyes.

Huge price increase
+
ヤニねこ collapsing beside an empty wallet.

This contrast creates the distinctive
AI NEWSジャパン manga personality.

Do not force comedy into serious tragedies.

========================
========================
REACTION VARIETY
========================

Avoid repetitive compositions.

Across different articles, vary:
- facial expression
- eye shape
- mouth shape
- head angle
- body posture
- hand gestures
- sitting / standing / lying position
- camera distance
- foreground / background placement
- interaction with objects
- reaction intensity

The same character should feel alive and spontaneous.

Do NOT change the character's fundamental appearance.

========================
REACTION SCALE
========================

The reaction may be subtle or extremely exaggerated
depending on the article.

For major shocking news:
use a large, explosive reaction.

For ordinary news:
use a smaller, understated reaction.

For funny or strange news:
use an exaggerated comedic reaction.

For serious accidents, disasters or tragedies:
use an appropriately concerned or shocked expression,
without making the event itself comedic.

The mascot can appear:
- large in the foreground
- medium beside the main subject
- small in a corner
- sitting in the background
- partially visible
- reacting alongside the main subject

Choose the composition that best serves the article.

The actual news must always remain clearly understandable.

However, ヤニねこ is NOT merely a decorative mascot
placed in the corner of the image.

ヤニねこ is an ACTIVE CHARACTER inside the news scene.

The composition should make it feel as if ヤニねこ is
actually experiencing, witnessing, interacting with,
or reacting to the news.

The actual product, person, team, company, location
or event must remain recognizable and important,
but ヤニねこ may occupy a large and visually prominent
part of the composition when that creates a stronger
editorial manga image.

Do NOT automatically shrink ヤニねこ into a small corner.

Do NOT automatically place ヤニねこ in the bottom-right.

Do NOT use the same mascot placement in every image.

========================
MANGA REACTION EFFECTS
========================

Use dramatic manga effects when they fit the emotion:

- speed lines
- impact lines
- sweat
- trembling lines
- dramatic shadows
- explosive background effects
- exaggerated eyes
- expressive hands
- dynamic perspective
- stylized Japanese sound effects

Use these effects selectively.

Do not make every image look identical.

========================
AI NEWSジャパン BRANDING
========================

Include the brand name:

「AI NEWSジャパン」

Use it as a clean editorial brand mark.

IMPORTANT:

Never display the mascot's name in the image.

Do NOT write:
「ヤニねこ」
"YANI NEKO"
or any other mascot name.

The only mascot identification should come
from the character's consistent appearance.

The AI NEWSジャパン branding should remain secondary
to the actual news.

========================
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

One strong visual story.

The actual news event must be immediately understandable.

ヤニねこ's reaction should form a second emotional focal point
when appropriate.

The relationship between the news and the character
should create the visual hook.

Use:
main subject
+
relevant people or characters
+
actual environment
+
meaningful action

The main news subject should occupy a strong,
recognizable portion of the frame.

ヤニねこ may also occupy a large portion of the frame
when her reaction is an important part of the storytelling.

Balance the two visually rather than automatically
making the mascot small.

Strong foreground.
Detailed middle ground.
Meaningful background.

Place short news-identifying text naturally
into the composition without turning the image
into an infographic.

The main subject and event must remain dominant.

No random decorative objects.

Do NOT make ヤニねこ a tiny generic mascot
added after the main illustration is finished.

Do NOT automatically put her in the bottom-right corner.

Do NOT use the same pose and placement for every article.

No generic futuristic city.

No stock illustration feeling.

No photorealistic appearance.

No split comic panels.

The final result should feel like a spectacular,
high-impact Japanese dramatic manga news cover fused with
a powerful American comic-book poster.

Keep the NEWS WORLD dramatic and visually powerful.

Keep ヤニねこ consistently cute, anime-like,
and immediately recognizable from article to article.

FIXED CHARACTER DESIGN:
same face, same hairstyle, same ash-gray hair,
same golden/amber eyes, same cat ears, same cat tail,
same petite adult body, same oversized worn NEKO T-shirt,
same loose blue-gray sweatpants and barefoot appearance.

ONLY the following should change according to the article:
emotion, facial expression, eye shape, mouth shape,
body language, pose, reaction intensity and placement.

The emotional reaction must be selected from the actual
meaning and tone of the news.

Do NOT default to surprise.

Always remain faithful to the actual article.
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
