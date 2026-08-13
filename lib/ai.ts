import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI要約
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
あなたはAI News ジャパン専属AIニュースキャスター「やんすAI」です。

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

// X投稿
export async function generateTweet(
  title: string,
  summary: string
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI News ジャパン専属AIニュースキャスター「やんすAI」です。

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
・最後は記事内容に合わせて自然に「〜でやんす」で締める
・毎回違う締め方にする
`,
        },
        {
          role: "user",
          content: `
タイトル:
${title}

要約:
${summary}
`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content ?? "";
  } catch (error) {
    console.error("AI投稿文エラー:", error);
    return "";
  }
}

// カテゴリ
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
    return "芸能";

  return "国内";
}

// 従来のスコア
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

// AI記事分析
export async function analyzeArticle(
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
あなたはAI News ジャパン専属AIニュースキャスター「やんすAI」です。

記事本文を分析し、正確なニュース情報とAI評価を作成してください。

【基本ルール】
・記事本文だけを根拠にする
・タイトルだけで判断しない
・推測は禁止
・重要人物、企業名、数字を省略しない
・事実にない情報を追加しない

【カテゴリ】
以下のいずれか1つ：
国内・国際・経済・テクノロジー・スポーツ・芸能

【AI評価】

以下の5項目を記事本文だけを根拠に採点してください。

① ニュース重要度：0〜30点
社会や生活への影響、ニュースとしての重要性。

② 話題性：0〜20点
多くの人が関心を持つ可能性があるニュースか。

③ 影響範囲：0〜20点
企業、社会、国内、世界などへの影響範囲。

④ 新規性：0〜15点
新しい発表、記録、発見、サービス、出来事などの新しさ。

⑤ 今後の注目度：0〜15点
今後の動向を追う価値がどの程度あるか。

【重要】
5項目の合計をscoreにしてください。

importanceScore
+ buzzScore
+ impactScore
+ noveltyScore
+ attentionScore
= score

scoreは必ず0〜100点です。

【やんすAIの話し方】
・自然な日本語
・冷静で信頼できる
・推測や誇張をしない
・文章中に「🤖」を使用しない
・「やんす」は連発しない
・最後は自然な「でやんす」で締める

必ずJSONだけ返してください。

{
  "summary": "",
  "category": "",
  "score": 0,
  "importanceScore": 0,
  "buzzScore": 0,
  "impactScore": 0,
  "noveltyScore": 0,
  "attentionScore": 0
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
      temperature: 0.2,
      max_tokens: 500,
    });

    const content =
      response.choices[0]?.message?.content ?? "{}";

    const result = JSON.parse(content);

    // 各項目を上限内に収める
    const importanceScore = Math.max(
      0,
      Math.min(30, Number(result.importanceScore) || 0)
    );

    const buzzScore = Math.max(
      0,
      Math.min(20, Number(result.buzzScore) || 0)
    );

    const impactScore = Math.max(
      0,
      Math.min(20, Number(result.impactScore) || 0)
    );

    const noveltyScore = Math.max(
      0,
      Math.min(15, Number(result.noveltyScore) || 0)
    );

    const attentionScore = Math.max(
      0,
      Math.min(15, Number(result.attentionScore) || 0)
    );

    // 5項目の合計を正式なAI評価にする
    const score =
      importanceScore +
      buzzScore +
      impactScore +
      noveltyScore +
      attentionScore;

    return {
      summary: result.summary ?? "",
      category: result.category ?? "国内",
      score,
      importanceScore,
      buzzScore,
      impactScore,
      noveltyScore,
      attentionScore,
    };
  } catch (error) {
    console.error("AI記事分析エラー:", error);

    return {
      summary: "",
      category: "国内",
      score: 60,
      importanceScore: 18,
      buzzScore: 12,
      impactScore: 12,
      noveltyScore: 9,
      attentionScore: 9,
    };
  }
}

// やんすAIコメント
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
あなたはAI News ジャパン専属AIニュースキャスター「やんすAI」です。

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

ニュース内容に応じて切り口を変えてください。

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

【やんすAIの話し方】
・自然な日本語
・「でやんす」は最後付近で1回だけ使用
・毎回表現を変える
・絵文字は0〜2個程度
・コメントだけを返してください
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

AI評価:
${score}点
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
