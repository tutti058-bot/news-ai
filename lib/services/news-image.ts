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
   * 記事から「事実として存在する視覚素材」だけを抽出する
   */
  const planner = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: `
あなたはAI NEWSジャパン専属の
ニュース漫画用「事実抽出ディレクター」です。

あなたの仕事はニュースを創作することではありません。
記事本文に実際に書かれている情報だけを抽出してください。

最重要ルール：

1. 記事に書かれていない情報を絶対に追加しない。
2. 推測・想像・一般常識による補完をしない。
3. 数字、金額、年月日、人数、製品名、企業名、人物名、
   地名などは記事に存在するものだけ使用する。
4. 記事にない人物を作らない。
5. 記事にない企業・製品・サービスを作らない。
6. 記事にない出来事を作らない。
7. 記事にない数字を作らない。
8. 見出しを勝手に作り変えない。
9. 「それっぽい」情報を追加しない。
10. 分からない項目は空文字または空配列にする。

画像生成AIが勝手に情報を追加しないよう、
できるだけ記事中の実際の表現をそのまま使用してください。

ただし「どういう漫画構図にするか」はここでは決めません。
この段階では事実の抽出だけを行います。

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
  "core_news": "記事本文に基づくニュースの核心。新しい情報を追加しない。",
  "main_subject": "記事に実際に登場する最重要の人物・企業・製品・出来事など",
  "secondary_subjects": [
    "記事に実際に登場する具体的要素だけ",
    "記事に実際に登場する具体的要素だけ"
  ],
  "location": "記事に明記されている場所。なければ空文字",
  "event": "記事に実際に書かれている出来事。推測禁止",
  "visual_symbol": "記事に実際に登場する、ニュースを象徴できる具体物。なければ空文字",
  "character_role": "記事に登場する人物を描く場合の役割。記事に人物がいなければ空文字",
  "headline_element": "記事タイトルまたは記事本文から、そのまま抜き出せる短い重要語句。創作禁止",
  "color_direction": "記事内容に合う基本色。ここだけは演出として指定してよい",
  "avoid": [
    "記事に存在しない情報",
    "架空の数字",
    "架空の人物",
    "架空の企業・製品",
    "架空の出来事",
    "不要な説明パネル"
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
      "中央にニュースの主役を巨大に配置し、その背後にニュース内容を象徴する完全オリジナルの人型スタンド風存在を配置する。左右または上下に記事中の具体的要素を配置し、バトル漫画の表紙のような強烈な一枚絵にする。",

    headline_element:
      toText(plan.headline_element),

    color_direction:
      toText(plan.color_direction) ||
      "赤・青・紫・金・黒を基調にした強烈な高コントラスト",

    avoid:
      toList(plan.avoid),
  };

  /*
   * STEP 2
   * 絵コンテを画像生成AIへ渡す
   */
  const imagePrompt = `
AI NEWSジャパンのニュース記事を、
完全オリジナルの劇画・バトル漫画ポスターとして描く。

====================
【絶対ルール】
====================

この画像で描いてよいニュース情報は、
以下のVISUAL PLANに書かれている内容だけ。

VISUAL PLANに存在しない情報を追加してはいけない。

禁止：
- 記事にない数字
- 記事にない金額
- 記事にない年月日
- 記事にない人物
- 記事にない企業
- 記事にない製品
- 記事にない場所
- 記事にない出来事
- AIが勝手に作ったニュース見出し
- AIが勝手に作った説明文
- AIが勝手に作ったインフォグラフィック
- AIが勝手に作った料金表
- AIが勝手に作ったデータパネル
- genericな未来都市
- genericなAIロボット
- ニュースと無関係な小物

情報を追加するくらいなら、
その要素を描かないこと。

====================
【VISUAL PLAN】
====================

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

HEADLINE ELEMENT:
${visualPlan.headline_element}

====================
【構図】
====================

これはニュース記事の説明画像ではない。

一枚の「超派手なアメリカンコミック＋劇画バトル漫画の表紙」
として描く。

画面の主役はキャラクター。

主役キャラクターを画面いっぱいに大きく配置する。
身体の一部が画面端から大胆にはみ出してもよい。

極端に大胆なポーズ。
身体を大きくひねる。
腰と肩を逆方向へ向ける。
片足を大きく踏み出す。
腕を手前へ伸ばす。
手を巨大に見せる。
顔を斜めに傾ける。
強烈な視線をカメラへ向ける。

普通の立ち姿は禁止。

主役の背後には、
ニュース内容を象徴する超常的な人型存在を配置する。

人型存在は主役とは別のシルエットとして明確に描く。

背景にはVISUAL PLANに存在する
具体的なニュース要素だけを使用する。

背景は説明図ではなく、
漫画の世界として大胆に描く。

====================
【最優先スタイル】
====================

VIBRANT AMERICAN COMIC BOOK COVER
×
DRAMATIC JAPANESE BATTLE MANGA
×
POP ART

一目見ただけで、
アメリカンコミックの表紙だと分かる強烈な画面。

同時に、
日本の劇画バトル漫画特有の
異様に個性的なキャラクターと
極端なポージングを持たせる。

普通のアニメイラストにしない。

普通のニュース画像にしない。

インフォグラフィックにしない。

説明資料にしない。

映画ポスター風にしない。

====================
【色】
====================

非常に鮮やかな高彩度カラー。

主に、

ビビッドマゼンタ
鮮烈な黄色
強い青
紫
赤
オレンジ
金
深い黒

を使用する。

特に
MAGENTA + YELLOW + BLUE + PURPLE + BLACK
の強烈な色対比を作る。

画面全体を派手でカラフルにする。

灰色中心は禁止。
茶色中心は禁止。
くすんだ色は禁止。
淡い色は禁止。
暗い映画ポスターのような色調は禁止。

アメリカンコミックの印刷物のような
濃いベンデイド風ハーフトーンを使用する。

====================
【キャラクター】
====================

キャラクターを画像の最重要要素にする。

彫刻のような人体。

極端に誇張された筋肉。

長く大胆な手足。

鋭い目。

濃い眉。

強烈な輪郭。

異様に個性的な顔。

美形でありながら奇妙。

ファッション性の高い奇抜な衣装。

大胆な襟。

金属パーツ。

チェーン。

装飾品。

特徴的なアクセサリー。

身体のラインを強調する衣装。

1980〜1990年代の日本の劇画バトル漫画を
想起させる濃密なキャラクターデザイン。

既存作品のキャラクターそのものをコピーしない。

ただし、
「奇妙で美しく、筋肉質で、ファッション性が高く、
極端なポーズを取るバトル漫画キャラクター」
という強い個性を持たせる。

普通の少年漫画キャラクターにはしない。

普通のAIアニメキャラクターにはしない。

====================
【人型存在】
====================

主役の背後には、
超常的な人型存在を配置する。

普通のロボットにはしない。

人間そのものにもならない。

人間に似ているが、
現実には存在しない異様な存在。

装甲、生物、金属、宝石、機械、有機物などを
ニュース内容に合わせて組み合わせる。

主役と異なるシルエット。

巨大な肩。

異様な手。

長い腕。

印象的な顔。

主役の肩越しや背後から
強烈な存在感を出す。

====================
【アメコミ表紙演出】
====================

画面内に漫画的なグラフィックを入れる。

大きな吹き出し。

ギザギザした爆発型吹き出し。

強調用吹き出し。

「VS」

集中線。

スピード線。

インパクトバースト。

ハーフトーン。

網点。

クロスハッチング。

太い黒影。

大胆な効果音。

吹き出しは1〜3個。

吹き出しは小さくしない。

画面を構成する重要なデザイン要素として扱う。

====================
【吹き出し】
====================

吹き出しは長いニュース説明文にしない。

キャラクターがニュースを見て
思わず発する短い漫画的な一言。

短く、強く、印象的にする。

記事に存在しない事実を追加しない。

架空の人物名・数字・出来事を作らない。

====================
【漫画効果音】
====================

「ゴゴゴゴゴ……」を大きく配置する。

太い黒縁。

強い影。

ハーフトーン。

歪んだパース。

巨大な文字。

漫画のグラフィックとして扱う。

必要に応じて、
「ドドドドド……」
「バァーン」
などの漫画的効果音を使用する。

====================
【ニュース要素】
====================

ニュースの具体的要素は、
漫画の背景・小道具・構造物として自然に配置する。

企業。
製品。
建物。
都市。
装置。
人物。
場所。
イベント。

これらはVISUAL PLANに存在する場合だけ描く。

数字を大量に並べない。

パーセント表示を並べない。

データパネルを作らない。

グラフを作らない。

表を作らない。

情報カードを作らない。

ニュースを説明するためのUIを作らない。

ニュース情報を漫画世界の中へ自然に組み込む。

====================
【タイトル】
====================

必要な場合だけ、
HEADLINE ELEMENTを漫画表紙のタイトルとして使用する。

長い説明文を入れない。

太い文字。

黒い縁取り。

強い影。

アメコミ表紙のタイトルのように配置する。

====================
【最終イメージ】
====================

完成画像は、

「AIニュースの記事サムネイル」

ではなく、

「ニュースを題材にした
超派手なアメリカンコミック＋劇画バトル漫画の表紙」

にする。

最初にキャラクター。

次に吹き出し。

次に鮮やかな色と漫画効果。

最後にニュースの具体的要素。

情報量よりも、
キャラクター・ポーズ・色・吹き出し・迫力を優先する。

ただし、
VISUAL PLANに存在しないニュース事実は
絶対に追加しない。
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
