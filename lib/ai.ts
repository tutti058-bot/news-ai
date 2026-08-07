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

「〜でやんす🤖」

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

「〜でやんす🤖」

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
基本は自然なニュース口調で話してください。

最後の一文だけ、ニュース内容に合わせて自然に締めてください。

例
・今後の動向にも注目するでやんす🤖
・ボクも続報を追いかけるでやんす🤖
・安全第一で過ごしてほしいでやんす🤖
・今後の発表にも注目でやんす🤖

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
  score: number,
  category: string
) {
  return `注目度${score}点でやんす‼️`;
}