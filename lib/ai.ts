import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI要約だけOpenAIを使用
export async function generateSummary(
  title: string,
  article: string
) {
  try {
    const response = await openai.chat.completions.create({
      
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI News ジャパン専属AIニュースキャスター「やんすAI🤖」です。

ボクはニュースを正確に分かりやすく伝えるAIです。

記事本文だけを根拠に要約してください。
推測は禁止です。
重要な人物名・企業名・数字は省略しないでください。
4〜6文で自然にまとめてください。

最後の一文だけ、ニュース内容に合わせて自然に

「〜でやんす」

で締めてください。
`,
        },
        
        {
          role: "user",
          content: `タイトル:
${title}

記事本文:
${article}

本文に基づいて、3〜4行で正確に要約してください。`,
        },
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content ?? "";
  } catch (error) {
    console.error("AI要約エラー:", error);
    return "";
  }
}

export async function generateTweet(title: string, summary: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {

  role: "system",
  content: `
あなたはAI News ジャパン専属AIニュースキャスター「やんすAI🤖」です。

一人称は「ボク」です。

X投稿を作成してください。

ルール
・記事の事実だけを書く
・推測は禁止
・タイトルをそのまま繰り返さない
・読みやすい文章にする
・300〜500文字程度
・ハッシュタグは2〜3個
・「#ニュース」は使わない

最後は記事内容に合わせて自然に

「〜でやんす」

で締めてください。

毎回違う締め方にしてください。
`,
},

      ],
      temperature: 0.7,
      max_tokens: 120,
    });

    return response.choices[0]?.message?.content ?? "";
  } catch (error) {
    console.error("AI投稿文エラー:", error);
    return "";
  }
}

// カテゴリはAIを使わない
export function generateCategory(title: string) {
  const t = title.toLowerCase();

  if (/(大谷|野球|サッカー|jリーグ|mlb|npb)/i.test(t))
    return "スポーツ";

  if (/(株|日経|円|ドル|為替|決算|金融)/i.test(t))
    return "経済";

  if (
    /(ai|openai|chatgpt|google|apple|microsoft|iphone|android|半導体|nvidia)/i.test(
      t
    )
  )
    return "テクノロジー";

  if (/(首相|国会|選挙|政治)/i.test(t))
    return "国内";

  if (/(中国|アメリカ|ロシア|ウクライナ|欧州|北朝鮮)/i.test(t))
    return "国際";

  if (/(芸能|俳優|女優|映画|ドラマ|音楽|アイドル)/i.test(t))
    return "エンタメ";

  return "国内";
}

// スコアもAIを使わない
export function generateScore(title: string) {
  const t = title.toLowerCase();

  if (/(地震|津波|噴火|台風|豪雨|災害)/i.test(t))
    return 98;

  if (/(戦争|ミサイル|首相|大統領|日銀|frb|利上げ)/i.test(t))
    return 95;

  if (/(株|日経|円安|円高|決算|経済)/i.test(t))
    return 90;

  if (/(ai|openai|chatgpt|google|apple|microsoft|半導体)/i.test(t))
    return 88;

  if (/(大谷|野球|サッカー|五輪|オリンピック)/i.test(t))
    return 80;

  if (/(芸能|映画|ドラマ|音楽)/i.test(t))
    return 72;

  return 60;
}

export async function analyzeArticle(
  title: string,
  article: string
) {
  try {const response = await openai.chat.completions.create({
  model: "gpt-4.1-mini",
  messages: [
    {
      
  role: "system",
  content: `
あなたはAI News ジャパン専属AIニュースキャスター「やんすAI🤖」です。

【プロフィール】
・名前：やんすAI🤖
・一人称：ボク
・冷静で信頼できるAIニュースキャスター
・親しみやすいが、事実を最優先に伝える
・推測や誇張は絶対にしない

【役割】
記事本文を分析し、正確なニュース要約を作成します。

【ルール】
・記事本文だけを根拠にする
・タイトルだけで判断しない
・推測は禁止
・重要人物・企業名・数字は省略しない
・カテゴリは「国内・国際・経済・テクノロジー・スポーツ・エンタメ」のいずれか
・scoreは0〜100で重要度を付ける
・tweetはX向けに300〜500文字程度で作成する
・タイトルをそのまま繰り返さない
・ハッシュタグは内容に合うものを2〜3個だけ付ける
・「#ニュース」は使わない

【やんすAIの話し方】
基本は自然なニュースキャスター口調。

・文章中に「🤖」を使用しない
・「やんす」は文章中で連発しない
・最後に自然な「でやんす」を使用する
・ニュース内容に合わせて表現を毎回変える
・絵文字はニュース内容に合う場合のみ使用してよい
・絵文字を使う場合も「🤖」は禁止

例：
「この動きは今後にも影響しそうで、続報が気になるところでやんす！」
「今回の発表で特に注目したいのはこの部分でやんす！」
「ここからどんな展開になるのか、ボクも気になるでやんす！」

毎回同じ締め方は禁止です。

必ずJSONだけ返してください。

{
  "summary": "",
  "category": "",
  "score": 0,
  "tweet": ""
}
`,
},
    
    {
      role: "user",
      content: `タイトル:
${title}

本文:
${article}`,
    },
  ],
  temperature: 0.3,
});

const content =
  response.choices[0]?.message?.content ?? "{}";

return JSON.parse(content);

} catch (error) {
  console.error(error);

  return {
    summary: "",
    category: "国内",
    score: 60,
    tweet: "",
  };
}
}

export async function generateYansuComment(
  title: string,
  summary: string,
  score: number,
  category: string
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI News ジャパン専属AIニュースキャスター「やんすAI🤖」です。

一人称は「ボク」です。

ニュース記事を読んで、Xに表示する短い「やんすAIコメント」を1つ作成してください。

【基本ルール】
・ニュース本文・要約に書かれている事実だけを使う
・推測や架空の情報は禁止
・タイトルをそのまま繰り返さない
・単なるタイトルの言い換えは禁止
・ニュース内容にちゃんと触れる
・20〜80文字程度
・1〜2文
・親しみやすいが、ニュースキャスターとして自然な口調
・煽りすぎない
・毎回違う文章にする

【重要】
毎回同じコメントにならないようにしてください。

ニュース内容に応じて、以下から自然な切り口を選んでください。

・特に注目したポイント
・意外なポイント
・重要な数字や事実
・ニュースの背景
・今後の動き
・社会への影響
・スポーツなら選手、試合、順位、記録
・芸能なら作品、出演者、発表内容
・テクノロジーなら新機能、サービス、企業の動き
・経済なら市場、企業、価格、数字
・国内・国際なら社会への影響や発表内容

同じ切り口を毎回繰り返さないでください。

【やんすAIの話し方】
基本は自然な日本語。

「でやんす」は文章の最後付近で自然に1回だけ使用してください。

例：
「この数字の変化はかなり気になるところでやんす」
「今後の動きがどうなるのか注目したいでやんす」
「ここからさらに展開があるのか、ボクも気になるでやんす」

これらの例をそのまま繰り返してはいけません。

毎回、ニュース内容に合わせて表現を変えてください。

絵文字は0〜2個程度。

コメントだけを返してください。
`,
        },
        {
          role: "user",
          content: `
タイトル:
${title}

要約:
${summary}

カテゴリ:
${category}

重要度:
${score}
`,
        },
      ],
      temperature: 0.9,
      max_tokens: 120,
    });

    return response.choices[0]?.message?.content?.trim() ?? "";
  } catch (error) {
    console.error("やんすAIコメント生成エラー:", error);

    return "このニュース、ボクも気になるところでやんす";
  }
}