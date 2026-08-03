import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateSummary(title: string) {
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
          content: title,
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

export async function generateCategory(title: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "ニュースタイトルを次のどれか1つだけで分類してください。\n\n国内\n国際\n経済\nスポーツ\nエンタメ\nテクノロジー",
        },
        {
          role: "user",
          content: title,
        },
      ],
      temperature: 0,
      max_tokens: 20,
    });

    return response.choices[0]?.message?.content?.trim() ?? "国内";
  } catch (error) {
    console.error("カテゴリ生成エラー:", error);
    return "国内";
  }
}

export async function generateScore(title: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "ニュースタイトルの重要度を0〜100の数字だけで返してください。数字以外は書かないでください。",
        },
        {
          role: "user",
          content: title,
        },
      ],
      temperature: 0,
      max_tokens: 5,
    });

    const score = Number(response.choices[0]?.message?.content);

    return Number.isNaN(score) ? 50 : score;
  } catch (error) {
    console.error("スコア生成エラー:", error);
    return 50;
  }
}