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

ニュースの主役を画面中央〜前景に巨大に配置。

主役は非常に強いポーズを取り、
読者の視線を一瞬で集める。

主役の背後には、
ニュース内容を象徴する完全オリジナルの
人型スタンド風存在を配置する。

この存在は人間とは明確に別の存在。

主役とスタンド風存在を重ねず、
それぞれのシルエットが明確に分かるようにする。

背景にはVISUAL PLANに記載された
場所・出来事・具体物だけを配置する。

全体は映画ポスターではなく、
「日本の劇画バトル漫画の表紙」のような構図。

====================
【画風】
====================

EXTREME DRAMATIC BATTLE MANGA
×
AMERICAN COMIC BOOK POSTER

強烈な劇画表現。

- 極太の黒インク線
- 鋭い輪郭
- 濃い黒ベタ
- 強烈なハーフトーン
- クロスハッチング
- 粗いインクブラシ
- 彫刻のような筋肉表現
- 極端な遠近法
- 強烈なパース
- 大胆なポージング
- 大きく突き出した手
- 鋭い目
- 強烈な表情
- ドラマチックな陰影
- 集中線
- スピード線
- 爆発的なエフェクト
- コミックのインパクトバースト
- 高コントラスト
- 赤・青・紫・金・黒
- ハーフトーンによる印刷漫画の質感

普通のアニメイラストにはしない。

かわいいキャラクターにはしない。

ソフトなAIイラストにはしない。

写実的な写真にはしない。

説明資料・広告・インフォグラフィックにはしない。

====================
【ゴゴゴ演出】
====================

「ゴゴゴゴゴ……」を必ず画面内に入れる。

非常に大きく、
背景または主役の周囲に配置する。

単なる文字ではなく、
漫画の効果音としてデザインする。

太い黒線、
強い影、
ハーフトーン、
歪んだパース、
巨大な文字サイズ。

「ゴゴゴゴゴ……」は
画面全体の迫力を作る重要なグラフィック要素。

====================
【文字】
====================

画像内のニュース関連文字は、
VISUAL PLANに存在する情報だけを使用する。

存在しない数字・固有名詞・説明文を生成しない。

文字を無理に大量に入れない。

大きなニュースタイトルを作る必要がある場合も、
HEADLINE ELEMENTに記載された文字だけを使用する。

====================
【最終目的】
====================

画像を見た瞬間、

「これは何のニュースなのか」

が分かること。

ただし、
ニュース情報は勝手に増やさない。

「記事内容は正確」
＋
「画面は極端に派手」
＋
「劇画バトル漫画」
＋
「アメコミポスター」
＋
「ゴゴゴゴゴ……」

この5つを同時に成立させる。

AI NEWSジャパン独自の
ニュース漫画ビジュアルとして完成させる。
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
