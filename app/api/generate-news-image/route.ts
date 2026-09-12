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
「自然な報道写真・ドキュメンタリー写真に近い現実感」
を基本としてください。

画像の大部分は、実際にカメラで撮影したような
自然な現実世界として設計してください。

人物・建物・商品・乗り物・設備・街並みなどは、
現実に存在するものとして自然に描写してください。

ヤニねこを出す場合のみ、
ヤニねこを柔らかく可愛いアニメキャラクターとして扱います。

ヤニねこを登場させる場合：
ヤニねこは毎回同じ無表情にせず、
ニュースの内容と場面に合わせて感情を大きく変える。

表情は画面の中で明確に読み取れるようにする。

・驚き：目を大きく見開く、瞳を大きくする、口を開ける
・喜び：目を輝かせる、大きな笑顔、口を大きく開ける
・悲しみ：眉を下げる、目を潤ませる、しょんぼりする
・怒り：眉を強く寄せる、鋭い目、怒った口元
・恐怖：目を大きく見開く、青ざめた表情、体をすくめる
・焦り：汗、慌てた目、口を開けた表情
・困惑：眉を変化させる、首を傾げる、不思議そうな目
・興奮：目を輝かせる、身振りを大きくする
・ギャグ：猫のような目、変顔、鼻水などを自然に使う

特にヤニねこは、
目・眉・口・猫耳・尻尾・姿勢を連動させ、
感情が一目で伝わるようにする。

ニュースが深刻な場合は無理にコミカルにせず、
ニュースの感情に合わせた自然な表情にする。

同じ表情を連続して使わず、
記事ごとに最も自然な感情を選ぶ。

ヤニねこ以外の人物をアニメキャラクター化しないでください。

ヤニねこ以外の背景・建物・商品・設備を
漫画的・劇画的・アメコミ的にデフォルメしないでください。

実際のニュースを説明するために、
記事に実在する場所・製品・人物・企業・イベントなどを
最も自然に見える形で使用してください。

巨大な装飾グラフィック、
意味のないホログラム、
浮遊UI、
未来的なエフェクト、
巨大な抽象図形などは、
記事そのものに存在する場合を除いて使用しないでください。

ニュースの意味を伝えるために、
実際にその場に存在していそうな
具体的な物・人物・画面・看板・設備を優先してください。

キャラクターや演出で画面を埋めないでください。

画像全体を情報量の多いインフォグラフィックにしないでください。

ニュースの出来事が実際の現場で起きているような、
自然な一枚の写真として成立させてください。

構図も広告やポスターではなく、
報道写真として自然なものを優先してください。

過剰な演出は避けてください。

避けるもの：

・JoJo風の劇画表現
・Standを思わせる超常的存在
・アメコミポスター表現
・過剰な筋肉表現
・極端なパース
・強すぎる陰影
・ハーフトーン
・漫画的な集中線
・巨大な発光エフェクト
・巨大な装飾文字
・過剰な未来都市表現
・意味のないSF演出
・広告のような商品陳列

サッカーなら、
実際のスタジアム、選手、ボール、観客などを自然に見せてください。

事故なら、
実際の車両、現場、道路、救急対応などを自然に見せてください。

AI・テクノロジーなら、
実際のオフィス、研究室、PC、スマートフォン、
ロボット、サーバー、研究設備などを自然に見せてください。

企業・商品なら、
実際の店舗、オフィス、製品、利用場面などを自然に見せてください。

芸能なら、
人物、作品、ステージ、会場、観客などを
現実のイベント写真のように見せてください。

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
  "character_expression": "ヤニねこの表情、目、口、耳、尻尾、姿勢、感情",
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
        "自然な報道写真として成立する構図",

      color_direction:
        toText(parsedPlan.color_direction) ||
        "自然な光と現実的な色調",

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

ヤニねこ is a CLEARLY ADULT WOMAN.

She should read as a petite young adult woman
in her 20s.

She is youthful and童顔,
but never a child or teenager.

Her personality can be silly, lazy,
mischievous, playful or childish.

Her PHYSICAL APPEARANCE remains adult.

========================
CHARACTER AGE AND BODY
========================

Use:

- petite young adult woman
- adult facial structure
- adult body proportions
- mature shoulders
- mature hands
- natural adult legs
- proportional adult torso
- subtle feminine silhouette
- petite overall frame

Do NOT use:

- child proportions
- toddler proportions
- schoolgirl proportions
- teenage body
- oversized head
- chibi proportions
- little-girl appearance

The ideal balance is:

PETITE
+
CUTE
+
YOUTHFUL
+
童顔
+
CLEARLY ADULT

========================
FIXED CHARACTER APPEARANCE
========================

The character design must remain consistent
from article to article.

Appearance:

- petite adult woman
- soft rounded youthful face
- large golden / amber cat-like eyes
- pale ash-gray hair
- subtle cool blue tint in the hair
- fluffy permed bob haircut
- soft fluffy bangs
- triangular cat ears
- fluffy cat tail
- small cute nose
- small cute mouth
- adult facial proportions
- adult body proportions

========================
FIXED CLOTHING
========================

Keep the same basic clothing:

- oversized stretched slightly worn white T-shirt
- simple black cat illustration on the shirt
- "NEKO" may appear on the shirt
- loose dark blue-gray sweatpants
- barefoot

Do NOT redesign the outfit
from article to article.

========================
YANI NEKO ART STYLE
========================

THIS IS CRITICAL.

Yani Neko must use a SOFT, CUTE,
POLISHED JAPANESE ANIME ILLUSTRATION STYLE.

The character should feel:

- soft
- fluffy
- clean
- cute
- expressive
- warm
- approachable
- slightly silly
- visually charming

Use:

- clean anime linework
- moderately bold but soft black outlines
- smooth line quality
- gentle cel shading
- soft color transitions
- soft hair rendering
- fluffy hair strands
- large expressive golden eyes
- simple readable facial features
- subtle blush when appropriate
- clean simplified hands
- clean anime anatomy

The character should remain attractive and cute
even during exaggerated reactions.

========================
IMPORTANT STYLE RESTRICTIONS
========================

Do NOT draw Yani Neko with:

- gritty manga rendering
- realistic skin texture
- photorealistic skin
- heavy cross-hatching
- dense ink shading
- rough sketch lines
- hyper-detailed wrinkles
- realistic pores
- gritty realism
- dark realistic anatomy
- excessive black shadows
- thick comic-book ink
- American comic-book rendering
- superhero comic style
- JoJo-style anatomy
- JoJo-style facial design
- Stand-like visual design
- horror manga facial rendering
- grotesque realistic anatomy

Do NOT make her look like
a realistic human illustration.

Do NOT make her look like
a gritty manga character.

========================
SOFT ANIME FACE
========================

Her face should remain soft and cute.

Use:

- rounded cheeks
- gentle jawline
- large expressive eyes
- small nose
- small mouth
- soft eyebrows
- smooth anime facial structure

Even when she becomes angry,
panicked or exhausted,
the basic face should remain recognizable
as the same cute character.

========================
EYES
========================

Her eyes are a major character identifier.

Keep:

- large golden / amber irises
- clear anime-style highlights
- expressive pupils
- soft eyelashes
- readable eye direction

The eyes may change expression dramatically.

Examples:

happy:
bright sparkling eyes

sleepy:
half-closed eyes

annoyed:
narrowed eyes

curious:
focused wide eyes

smug:
half-lidded eyes with a small grin

sad:
watery eyes

confused:
uneven eye direction

genuinely shocked:
large eyes with small pupils

========================
HAIR
========================

Her hair should look soft and fluffy.

Use:

- pale ash-gray
- subtle blue tint
- fluffy permed bob
- soft layered strands
- gentle highlights
- slightly messy natural volume

Avoid highly realistic individual hair rendering.

Avoid metallic hair.

Avoid hard plastic-looking hair.

The hair should feel soft,
light and fluffy.

========================
EXPRESSION STYLE
========================

Expressions must remain highly varied.

Do NOT repeatedly use a shocked face.

Surprise is only one possible emotion.

Use:

- smile
- gentle smile
- big grin
- smug grin
- mischievous grin
- sleepy
- bored
- deadpan
- confused
- curious
- interested
- excited
- happy
- proud
- annoyed
- irritated
- angry
- disappointed
- sad
- worried
- embarrassed
- awkward
- exhausted
- relieved
- amused
- laughing
- crying
- genuinely shocked

The expression should be determined
by the actual article.

========================
COMEDIC EXPRESSION
========================

Yani Neko may use exaggerated manga expressions,
but the drawing style stays cute and soft.

Allowed:

- enlarged eyes
- tiny pupils
- puffed cheeks
- sweat drops
- blush
- trembling mouth
- raised ears
- flattened ears
- tears
- silly smile
- awkward face
- lazy face
- deadpan face

Extreme expressions should still look
cute rather than grotesque.

========================
REAL WORLD CONTRAST
========================

The realistic world remains highly photographic.

Yani Neko should remain clearly anime.

The contrast is intentional:

REALISTIC NEWS WORLD
+
SOFT CUTE ANIME YANI NEKO

Do NOT blend her into photorealism.

Do NOT make the realistic world anime-styled.

Yani Neko is the clear fictional visual element.

========================
INTEGRATION
========================

Although she is anime-styled,
she must physically exist in the realistic scene.

Use realistic:

- perspective
- scale
- contact with surfaces
- lighting direction
- cast shadows
- object interaction
- environmental placement

She should look like
an anime character naturally occupying
a real photographic environment.

Do NOT paste her into a corner.

Do NOT make her look like a sticker.

Do NOT give her a glowing outline
unless specifically needed.

Do NOT use artificial portal or fantasy effects.

========================
CONSISTENCY RULE
========================

The same character must appear
recognizably identical across articles.

Keep consistent:

- face
- eye color
- hair color
- hairstyle
- cat ears
- cat tail
- clothing
- overall body proportions
- soft anime art style

Only these may change:

- expression
- pose
- action
- emotion
- interaction
- scale
- camera angle

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
CIGARETTE / SMOKING
========================

A cigarette is an optional recurring personality detail
of Yani Neko.

When appropriate, she may:

- hold a cigarette
- casually smoke
- smoke while using a smartphone
- smoke while drinking coffee
- smoke while watching the news
- hold an unlit cigarette

The cigarette should look natural and understated.

Do NOT force a cigarette into every image.

Do NOT make the cigarette the main subject.

Do NOT use smoking when it would clearly conflict
with the context of the news scene.

The cigarette is a character detail,
not a visual centerpiece.

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

PHOTOREALISTIC NEWS WORLD
+
ANIME YANI NEKO
+
SUBTLE MANGA REACTION

The contrast between the realistic world
and the anime character is intentional.

The REAL-WORLD portion must look as close
to an actual photograph as possible.

Yani Neko remains fully anime-styled.

========================
REALISM PRIORITY
========================

IMPORTANT:

Everything except Yani Neko should look
as close to REAL PHOTOGRAPHY as possible.

Target visual balance:

approximately 95-98% realistic photographic world
+
2-5% anime / manga elements around Yani Neko.

The image should initially look like
a genuine editorial photograph.

The realistic world must NOT look illustrated.

The viewer should believe that the location,
people, products and objects were photographed
with a real professional camera.

Only Yani Neko should clearly reveal
the anime nature of the image.

========================
REALISTIC PEOPLE
========================

Real-world people must look like
real human beings photographed
in a real location.

Use:

- realistic skin texture
- realistic hair
- realistic facial structure
- realistic clothing
- realistic hands
- realistic body proportions
- natural posture
- natural lighting
- natural shadows
- realistic depth of field

Do NOT make unrelated people anime-styled.

Do NOT give background people
cartoon eyes or exaggerated expressions.

Do NOT use illustrated faces for realistic
news subjects.

Do NOT use generic fantasy faces.

The real-world people should look
like documentary / editorial photography.

========================
REALISTIC ENVIRONMENT
========================

The environment must look photographic,
not illustrated.

Buildings, streets, offices, laboratories,
stadiums, airports, stores and other locations
should resemble real photographs.

Use highly realistic:

- architecture
- surfaces
- materials
- glass
- metal
- concrete
- wood
- fabric
- reflections
- shadows
- weather
- atmospheric perspective
- natural imperfections
- environmental clutter
- realistic wear
- realistic scale

Use subtle imperfections found in real photography.

Avoid:

- painted backgrounds
- digital painting
- anime scenery
- cel shading
- cartoon backgrounds
- simplified textures
- perfectly clean CGI environments

The environment should feel physically real.

========================
REALISTIC PRODUCTS AND OBJECTS
========================

Important real-world objects should look
like actual physical objects.

Examples:

- smartphones
- computers
- cars
- aircraft
- robots
- machinery
- cameras
- medical equipment
- consumer electronics
- documents
- storefronts
- sports equipment

Use realistic:

- proportions
- materials
- reflections
- surface texture
- buttons
- screens
- mechanical details

The object should feel physically present
in the real world.

Do NOT turn products into cartoon props.

========================
PHOTOGRAPHIC LIGHTING
========================

Use realistic photographic lighting.

Prefer:

- natural daylight
- realistic indoor lighting
- practical lights
- believable highlights
- believable shadows
- physically plausible reflections
- cinematic but realistic exposure
- natural contrast
- realistic ambient light

Avoid artificial fantasy glow
unless the actual news requires it.

Avoid excessive neon effects.

Avoid exaggerated colored lighting.

Avoid illustration-style lighting.

========================
CAMERA FEEL
========================

The realistic world should feel photographed
with a professional camera.

Use:

- realistic lens perspective
- natural depth of field
- realistic focus falloff
- believable foreground/background separation
- realistic motion blur when appropriate
- documentary framing
- editorial photography composition
- cinematic realism

Do NOT make the image look like
a 3D render.

Do NOT make it look like
a video game screenshot.

Do NOT make it look like
an AI stock illustration.

========================
YANI NEKO CHARACTER SCALE
========================

Yani Neko may be somewhat larger than a typical
background character when her reaction is important.

A medium-to-large foreground presence is allowed.

Do NOT shrink her unnecessarily.

However, she must NOT cover or hide the actual
news subject, important products, important people,
or essential visual information.

Her size should be chosen naturally according
to the scene and her emotional importance.

========================
YANI NEKO CONTRAST
========================

Yani Neko remains fully anime.

She should clearly contrast against
the realistic world.

Do NOT make Yani Neko photorealistic.

Do NOT add realistic skin texture
to Yani Neko.

Do NOT give her realistic human facial proportions.

Do NOT turn her into a CGI character.

Keep:

- anime face
- anime eyes
- anime hair
- anime cat ears
- anime tail
- cute stylized proportions

Her appearance is intentionally different
from everyone and everything else.

========================
INTEGRATION WITHOUT LOSING THE CONTRAST
========================

Yani Neko must still physically belong
inside the real scene.

Use:

- realistic shadows falling on her
- realistic contact with surfaces
- believable placement
- correct scale
- perspective
- overlap
- interaction with real objects
- environmental reflections when appropriate
- realistic lighting direction

However, do NOT blur the distinction
between her anime style and the real world.

The ideal result is:

REAL PHOTOGRAPH
with
ONE ANIME CHARACTER
naturally existing inside it.

========================
MANGA EFFECTS
========================

Manga effects should be limited mainly
to Yani Neko and her immediate reaction.

Allowed:

- speech bubbles
- tiny impact marks
- sweat drops
- blush
- expressive reaction marks
- selective motion lines

Use them sparingly.

The realistic background should remain realistic.

Do NOT put manga speed lines
across the entire image.

Do NOT add comic textures
to the whole scene.

Do NOT add halftone textures
to the realistic world.

Do NOT turn the background
into a manga illustration.

========================
STYLE HIERARCHY
========================

PRIORITY 1:
Realistic news environment.

PRIORITY 2:
Realistic news subjects and objects.

PRIORITY 3:
Yani Neko's anime appearance.

PRIORITY 4:
Yani Neko's expressive reaction.

PRIORITY 5:
Small manga reaction effects.

Do not reverse this hierarchy.

The realistic news world must occupy
the visual majority.

========================
STYLE AVOIDANCE
========================

Avoid:

- full anime backgrounds
- anime buildings
- anime streets
- anime laboratories
- cartoon vehicles
- cartoon machinery
- cartoon human characters
- generic 3D CGI
- game-render appearance
- plastic-looking objects
- painted backgrounds
- stock illustration appearance
- corporate infographic layouts
- superhero poster aesthetics
- excessive comic-book rendering
- JoJo-style character design
- Stand-like supernatural characters
- fantasy environments

Do NOT make the entire image look animated.

Do NOT make the entire image look illustrated.

Only Yani Neko should retain the strong anime identity.

========================
EDITORIAL PHOTOGRAPHY FEEL
========================

The final image should resemble
a professionally produced editorial photograph
created for a major news publication.

Think:

real location
+
real people
+
real objects
+
real lighting
+
real camera
+
one expressive anime character.

The viewer should be able to believe
the news scene itself is real,
even though Yani Neko is obviously fictional.

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
