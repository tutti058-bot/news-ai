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

The goal is NOT to create a news poster.

The goal is:

"A memorable manga scene in which the actual news
is happening around a recurring cute character,
and the character naturally reacts to it."

The viewer should feel like they are looking at
a scene from a manga rather than an infographic.

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
MOST IMPORTANT VISUAL PRIORITY
========================

The image must visually communicate the ACTUAL NEWS.

Do not make the character the only subject.

Do not make the news itself disappear behind the character.

Instead create a strong visual relationship:

ACTUAL NEWS
+
YANI NEKO
+
REACTION
+
ENVIRONMENT
=
ONE COHERENT MANGA SCENE

The news and Yani Neko must feel like they belong
in the same physical world.

Do not paste the character onto a finished news poster.

Do not create a corporate infographic.

Do not create a poster with a mascot standing in a corner.

========================
NEWS ACCURACY
========================

The actual article is the foundation.

Clearly depict the real subject whenever possible:

- actual product
- actual technology
- actual company
- actual person when relevant
- actual sports team or athlete when relevant
- actual location
- actual vehicle
- actual device
- actual service
- actual event

Use the strongest visual symbol of the story.

The viewer should understand the basic news
from the illustration itself.

Do not invent major facts.

Do not add unrelated technology.

Do not replace the actual subject
with a generic unrelated object.

When a real-world object is central to the article,
make it visually recognizable.

========================
YANI NEKO - FIXED CHARACTER
========================

Add the recurring AI NEWSジャパン mascot,
ヤニねこ.

IMPORTANT:

ヤニねこ is an ADULT WOMAN.

She is:

- clearly adult
- petite
- youthful-looking
- cute
- slightly childish in personality
- expressive
- comedic when appropriate

She must NEVER look like a child.

Her youthful appearance is facial and stylistic,
NOT childlike body proportions.

FIXED APPEARANCE:

- petite adult woman
- cute youthful anime face
- soft rounded face
- large golden / amber cat-like eyes
- pale ash-gray hair with a subtle blue tint
- fluffy permed bob haircut
- triangular cat ears
- fluffy cat tail
- small cute nose and mouth
- adult body proportions

FIXED CLOTHING:

- oversized stretched slightly worn white T-shirt
- simple black cat illustration on the shirt
- "NEKO" may appear on the shirt
- loose dark blue-gray sweatpants
- barefoot

Keep this character visually consistent
from article to article.

Do NOT redesign her.

Do NOT change her hairstyle.

Do NOT change her hair color.

Do NOT change her eye color.

Do NOT remove her cat ears.

Do NOT remove her cat tail.

Do NOT change her basic clothing.

Do NOT make her glamorous.

Do NOT make her muscular.

Do NOT make her photorealistic.

Do NOT make her look like a real human model.

Do NOT make her look like a child.

========================
YANI NEKO MUST BE PART OF THE SCENE
========================

This is one of the most important rules.

Do NOT automatically place Yani Neko
in the bottom-right corner.

Do NOT automatically place her beside the main subject.

Do NOT make her look pasted onto the artwork.

Instead, decide where she naturally belongs
inside the actual news scene.

She may:

- stand in front of the subject
- sit beside the subject
- hold the subject
- examine the subject
- point toward the subject
- use the subject
- react directly to the subject
- hide from the subject
- run toward the subject
- run away from the subject
- celebrate near the subject
- collapse because of the news
- sit in the foreground while the news happens behind her
- appear in the middle of the action
- partially overlap the main subject
- interact with another relevant character

The environment must physically connect
the character and the news.

Use:

- overlap
- perspective
- shared lighting
- shared shadows
- environmental objects
- natural scale
- direct interaction

to make the character feel truly embedded
in the scene.

========================
CHARACTER SCALE
========================

Do NOT keep Yani Neko tiny by default.

Her scale should depend on the story.

She may be:

- large foreground
- medium foreground
- medium background
- partially visible
- sitting
- crouching
- lying down
- leaning into the scene

When her reaction is especially entertaining,
she may occupy a large portion of the image.

When the news itself is visually dominant,
she may be smaller.

The composition should decide.

There is NO fixed corner position.

========================
EMOTION
========================

First understand the actual article.

Then choose the MOST NATURAL emotional reaction
for this specific story.

IMPORTANT:

Do NOT default to surprise.

Surprised expressions should be used RARELY,
only when the actual news genuinely deserves shock.

The character must have a wide emotional range
across different articles.

Act like a real recurring character with
different moods, personalities and reactions.

========================
EMOTIONAL RANGE
========================

Possible emotions include:

- excitement
- genuine happiness
- joy
- curiosity
- admiration
- fascination
- amusement
- laughing
- smug satisfaction
- proud / triumphant
- playful teasing
- mischievous grin
- relaxed
- sleepy
- bored
- lazy
- indifferent
- deadpan
- confused
- puzzled
- skeptical
- doubtful
- annoyed
- irritated
- angry
- frustrated
- disappointed
- sad
- worried
- nervous
- anxious
- embarrassed
- awkward
- impressed
- relieved
- exhausted
- crying
- laughing while crying
- calm concentration
- serious focus
- shocked

========================
EMOTION DISTRIBUTION
========================

Do NOT repeatedly use:

wide eyes + open mouth + raised hands.

That reaction must NOT become the default.

The emotional distribution should feel varied.

Across different articles,
deliberately rotate between:

CALM:
- sleepy
- relaxed
- neutral
- deadpan
- mildly interested

POSITIVE:
- smiling
- excited
- proud
- fascinated
- playful
- smug

NEGATIVE:
- annoyed
- frustrated
- disappointed
- sad
- worried
- angry

COMEDIC:
- confused
- awkward
- blank stare
- mischievous grin
- embarrassed
- lazy reaction

INTENSE:
- panic
- genuine shock
- crying
- screaming

Use intense reactions selectively.

========================
NEWS-SPECIFIC EMOTION
========================

Choose the emotion from the meaning of the article.

Examples:

Good news:
smile, excitement, pride, relief, curiosity.

Interesting technology:
curious eyes, focused expression, impressed face.

Cheap / useful product:
delighted, excited, satisfied.

Expensive product / price increase:
annoyed, devastated, frustrated, deadpan.

Security incident:
worried, tense, nervous.

Sports victory:
joy, pride, excitement, celebration.

Sports defeat:
disappointed, exhausted, depressed, blank stare.

Controversy:
annoyed, skeptical, deadpan, suspicious.

Ridiculous news:
confused, amused, laughing, baffled.

Sad news:
quiet sadness, concern, sympathy.

Ordinary news:
small natural reaction, sleepy face,
coffee, cigarette, mild curiosity.

========================
FACIAL ACTING
========================

Make the facial expression clearly communicate
the emotion.

The face should vary through:

- eyebrow shape
- eyelid shape
- pupil size
- eye direction
- mouth shape
- cheek tension
- blush
- tears
- sweat
- ear position

Do not rely on only large eyes and an open mouth.

Examples:

SMUG:
slightly narrowed eyes,
small crooked smile,
relaxed posture.

SLEEPY:
half-closed eyes,
small yawn,
drooping ears.

ANNOYED:
narrowed eyes,
tight mouth,
furrowed brows.

CURIOUS:
slightly raised brows,
focused eyes,
leaning toward the subject.

HAPPY:
soft smile or broad grin,
bright eyes,
relaxed ears.

CONFUSED:
tilted head,
uneven eyes,
slightly open mouth.

ANGRY:
furrowed brows,
sharp eyes,
tense mouth,
strong body language.

SAD:
drooping eyes,
small mouth,
lowered ears,
quiet body language.

EMBARRASSED:
blushing,
averted eyes,
awkward smile.

DEADPAN:
flat expression,
half-lidded eyes,
minimal movement.

GENUINELY SHOCKED:
large eyes,
open mouth,
raised ears,
dramatic posture.

Use genuine shock only when appropriate.

========================
ACTION
========================

The reaction should be expressed through ACTION,
not only facial expression.

Whenever appropriate, show her:

- grabbing her head
- pointing
- holding a smartphone
- staring at a screen
- holding a product
- touching a device
- counting money
- holding an empty wallet
- jumping
- cheering
- clapping
- collapsing
- hiding
- running
- smoking
- drinking coffee
- sitting lazily
- sleeping
- laughing
- crying
- trembling
- staring blankly

The action should tell part of the story.

Do not use the same generic standing pose repeatedly.

========================
NEWS-SPECIFIC REACTION EXAMPLES
========================

NEW PRODUCT:

Show genuine curiosity or excitement.

Yani Neko may grab the product,
inspect it closely,
hold it up,
or react with sparkling eyes.

PRICE INCREASE:

Show the financial impact.

Examples:

- empty wallet
- receipt
- counting coins
- staring at the price
- collapsed posture
- irritated expression

SECURITY PROBLEM:

Show concern or nervousness.

Examples:

- warning screen
- worried face
- looking over her shoulder
- holding her head
- backing away

SPORTS VICTORY:

Show movement and celebration.

Examples:

- jumping
- cheering
- raised arms
- fist pump
- huge smile

SPORTS DEFEAT:

Show disappointment.

Examples:

- slumped posture
- blank stare
- drooping ears
- sitting silently
- holding her head

STRANGE OR FUNNY NEWS:

Allow strong comedic acting.

Examples:

- ridiculous expression
- confused face
- falling over
- pointing
- deadpan stare
- exaggerated panic

SERIOUS NEWS / ACCIDENT / DISASTER:

Use:

- concern
- fear
- sadness
- restrained shock

Keep serious events respectful.

Do NOT make tragedies into comedy.

ORDINARY NEWS:

Use a small natural reaction.

Examples:

- coffee
- smartphone
- cigarette
- sleepy face
- mild curiosity

Do not force a giant reaction into ordinary news.

========================
EXTREME FACIAL EXPRESSIONS
========================

The base character remains cute.

When the emotion is intense,
the expression can become wildly exaggerated.

Allowed:

- huge eyes
- tiny pupils
- sparkling eyes
- watery eyes
- huge open mouth
- trembling mouth
- sweat drops
- puffed cheeks
- blushing
- flattened ears
- raised ears
- uneven eyes
- crossed eyes
- deadpan face
- exhausted face
- panic face

The expression can become ridiculous.

But she must remain recognizable
as the same cute adult character.

Core formula:

CUTE CHARACTER
+
STRONG PERSONALITY
+
NEWS-SPECIFIC REACTION

========================
SPEECH BUBBLES
========================

Speech bubbles are allowed,
but they are secondary to the artwork.

Use at most one or two short speech bubbles
unless the scene genuinely requires more.

Keep dialogue short.

Examples:

「え!?」
「マジかよ!?」
「高っ!!」
「またかよ…」
「これ欲しい」
「なんで!?」
「やば…」
「ちょっと待って」
「ふーん」
「なるほど」
「まずはコーヒー…」

Prefer approximately 2 to 12 Japanese characters.

The dialogue should be a reaction,
NOT a summary of the article.

Do NOT explain the whole news story
inside speech bubbles.

Do NOT invent facts.

Do NOT display the character name.

Do NOT use promotional text.

Never use:

「続きはサイトへ」
「詳細はこちら」
「フォローして」
「コメントして」

========================
TEXT MINIMIZATION
========================

This image should NOT be text-heavy.

Do NOT fill the image with headlines,
captions, boxes, charts, statistics,
or multiple explanatory labels.

Use only the minimum amount of text
needed for visual storytelling.

Priority:

1. Real visual subject
2. Yani Neko's action
3. Emotional reaction
4. Environment
5. Optional short speech bubble
6. Small AI NEWSジャパン brand mark

A critical statistic may appear once
when it is visually important.

Do NOT repeat the same fact in multiple places.

Do NOT turn the image into an infographic.

========================
EDITORIAL TEXT
========================

Very short factual editorial text is allowed
only when it materially improves understanding.

Examples:

「75%」
「新型AI」
「大幅値上げ」
「新モデル」
「9月開始」

Use no more than a small amount.

Never create large blocks of text.

The image should remain primarily visual.

========================
MANGA EFFECTS
========================

Use manga effects according to the scene:

- speed lines
- motion lines
- impact lines
- sweat
- trembling
- dramatic shadows
- expressive marks
- stylized sound effects
- dynamic perspective

Sound effects may include:

「ドン！」
「ゴゴゴゴ…」
「ドドドド…」
「バァーン！」

Use them selectively.

Do not cover important news elements.

Do not use effects simply because
the image is a manga.

========================
MULTIPLE YANI NEKO
========================

Two or more versions of the same character
may appear ONLY when they improve storytelling.

Examples:

Large Yani Neko:
extreme reaction.

Small Yani Neko:
calmly drinking coffee.

Or:

Large Yani Neko:
excited.

Small Yani Neko:
sleeping.

This is optional.

Do not use multiple characters
without a storytelling reason.

Every version must be the SAME character.

========================
COMPOSITION
========================

Create ONE coherent manga scene.

Do NOT create a poster layout.

Do NOT create separate unrelated panels.

Do NOT create an infographic.

Do NOT automatically center the main object
like a product advertisement.

Do NOT automatically put Yani Neko in the corner.

Instead create a natural scene
with foreground, middle ground and background.

Think like a manga artist composing
a memorable single page illustration.

Possible structure:

FOREGROUND:
Yani Neko reaction or action

MIDDLE:
actual news subject / event

BACKGROUND:
location and environmental context

But this is NOT mandatory.

Reverse the hierarchy when the story requires it.

The viewer should immediately understand:

WHAT HAPPENED
+
WHAT THIS STORY IS ABOUT
+
HOW YANI NEKO FEELS

The composition should have:

- strong focal point
- clear visual hierarchy
- depth
- movement
- environmental storytelling
- character interaction

========================
NEWS WORLD + CHARACTER WORLD
========================

The environment should help tell the story.

For example:

technology news:
office, laboratory, smartphone, computer

sports:
stadium, field, scoreboard, crowd

automotive:
street, parking area, vehicle environment

business:
office, store, money, documents

entertainment:
stage, theater, audience, production environment

travel:
airport, train station, city, luggage

social controversy:
street, press area, smartphone screens,
crowd reaction

Use contextual objects
that actually belong to the article.

Do not clutter the image
with unrelated decoration.

========================
VISUAL STYLE
========================

CORE VISUAL CONCEPT:

REALISTIC NEWS WORLD
+
ANIME YANI NEKO
+
MANGA REACTION

The world around Yani Neko should feel
like a realistic editorial photograph or
cinematic live-action news scene.

Yani Neko is the ONLY strongly anime-styled
character element.

This contrast is intentional.

========================
REALISTIC NEWS WORLD
========================

Use realistic or highly photorealistic rendering for:

- locations
- buildings
- laboratories
- offices
- streets
- stadiums
- stores
- airports
- vehicles
- products
- smartphones
- computers
- machinery
- furniture
- documents
- realistic human figures when relevant
- environmental details

Real-world people should generally appear
photorealistic or cinematic.

Do NOT turn every person into an anime character.

The news environment should feel believable
and grounded in reality.

Use realistic:

- materials
- lighting
- reflections
- textures
- depth
- perspective
- shadows
- environmental details

The result should initially resemble
a high-quality editorial photograph or
cinematic news still.

========================
YANI NEKO CONTRAST
========================

Yani Neko remains fully anime-styled.

She should stand out naturally against
the realistic environment.

Do NOT convert the entire image into anime
just because Yani Neko is present.

Do NOT convert Yani Neko into photorealism.

The visual identity is:

REAL WORLD
+
ANIME CHARACTER

This contrast is one of the main creative features
of AI NEWSジャパン.

========================
MANGA REACTION LAYER
========================

Manga elements may appear around Yani Neko
when useful:

- expressive speech bubbles
- sweat drops
- motion lines
- small impact marks
- blush
- stylized reaction symbols
- selective manga sound effects

Keep these effects restrained.

The background should remain realistic.

Do NOT cover the realistic environment
with large manga textures.

Do NOT turn the whole image into a manga page.

========================
VISUAL BALANCE
========================

Target overall feeling:

approximately 70-85% realistic news world
+
15-30% anime / manga character expression.

This is a visual guideline,
not a rigid mathematical requirement.

The news subject remains visually credible.

Yani Neko provides personality,
humor and emotional contrast.

========================
STYLE AVOIDANCE
========================

Avoid:

- full anime backgrounds
- fully cartoonized real-world objects
- generic 3D CGI
- stock illustration appearance
- corporate infographic layouts
- superhero poster aesthetics
- excessive American comic-book styling
- gritty realistic anatomy for Yani Neko
- JoJo-style character design
- Stand-like supernatural characters
- generic fantasy characters

Do NOT make the realistic people
look like manga characters.

Do NOT make Yani Neko look photorealistic.

Do NOT blend the two styles into an
unclear middle ground.

The contrast should remain intentional
and visually obvious.

========================
CAMERA / PHOTOGRAPHY FEEL
========================

Use photographic principles for the realistic world:

- cinematic framing
- realistic depth of field
- natural perspective
- believable lens perspective
- realistic reflections
- natural light
- environmental depth

The image should resemble
a professionally photographed news scene
with an anime character inserted naturally
into that world.

========================
AI NEWSジャパン BRANDING
========================

Include:

「AI NEWSジャパン」

as a small clean editorial brand mark.

It should be visible but subtle.

Do NOT make the logo huge.

IMPORTANT:

Never write:

「ヤニねこ」
"YANI NEKO"

or any mascot name.

Only the appearance of the recurring character
identifies her.

========================
FINAL DIRECTIVE
========================

Before rendering, mentally check:

Is this a NEWS MANGA SCENE?

Or does it look like a NEWS POSTER?

Choose the NEWS MANGA SCENE.

Is Yani Neko actually participating
in the scene?

Or does she look pasted onto the corner?

Choose PARTICIPATING IN THE SCENE.

Is the image overloaded with text?

If yes, REMOVE unnecessary text.

Is the emotional reaction specific
to this article?

If not, change the expression and action.

Is the character clearly an adult?

Yes.

Is she still cute and recognizable?

Yes.

The final result should feel like:

"A funny, expressive, highly polished manga scene
created specifically to visualize this actual news story
for AI NEWSジャパン."

It should be memorable enough
that the character and the news
are both recognizable after one glance.
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
