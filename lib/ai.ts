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
          content:
            "あなたはニュース編集者です。ニュースのタイトルから、日本語で3〜4行の自然な要約を作成してください。",
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
  content: `あなたはXで100万インプレッションを狙うニュース編集者です

以下のルールで投稿文を作成してください。

・最初の1文で興味を引く
・タイトルをそのまま繰り返さない
・要約を自然な文章で1〜2文にする
・最後に「👇詳細はこちら」は書かない
・ハッシュタグは内容に合うものを2〜3個だけ付ける
・「#ニュース」は使わない
・全体で120文字以内`,
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
あなたはプロのニュース編集者です。

記事を分析して、必ずJSONだけ返してください。

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