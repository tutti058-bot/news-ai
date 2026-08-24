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

この記事を「AI NEWS ジャパンに掲載する価値」という観点で0〜100点で評価してください。

重要なのは社会的影響だけではありません。
ニュースのジャンルに応じて、以下を総合的に判断してください。

・社会や生活への影響
・企業やサービスの大きな動き
・著名人の重大発表
・人気作品、映画、ドラマ、アニメなどの重大発表
・大型イベントや新作発表
・記録達成や注目される出来事
・多くの人が関心を持つ可能性
・今後さらに話題が広がる可能性

特に芸能・スポーツ・エンタメでは、
「社会への影響が小さい」という理由だけで低得点にしないでください。

【芸能】
著名人の結婚・出産・休養・重大発表など
→ 60〜85点を目安

人気俳優・アーティスト・アイドルの大きなニュース
→ 60〜80点を目安

小規模なイベント参加、日常的なSNS投稿など
→ 40〜60点を目安

【エンタメ】
人気作品の続編・新作映画・大型企画・放送決定など
→ 60〜90点を目安

作品に関する小さな話題や細かな変更
→ 40〜60点を目安

【スポーツ】
重要大会、優勝、記録、移籍、代表関連など
→ 70〜95点を目安

一般的な試合結果や小規模な話題
→ 50〜75点を目安

【一般ニュース】
社会的・経済的・生活上の影響が大きいもの
→ 70〜100点

影響が限定的なニュース
→ 40〜70点

【低評価】
単なる商品紹介、広告色の強い記事、軽微な告知、
内容が薄い記事、ニュース性の低い記事
→ 20〜50点

① ニュース重要度：0〜30点
そのジャンルにおいてニュースとしてどれだけ重要か。

② 話題性：0〜25点
著名人、人気作品、企業、SNSなどを含め、
多くの人が関心を持つ可能性。

③ 影響・注目範囲：0〜20点
社会、企業、ファン、視聴者、スポーツ界など、
そのニュースが影響・注目を集める範囲。

④ 新規性：0〜15点
新しい発表、出来事、記録、作品、サービスなどの新しさ。

⑤ 今後の注目度：0〜10点
今後さらにニュースや話題が広がる可能性。

【重要】
5項目の合計をscoreにしてください。

importanceScore
+ buzzScore
+ impactScore
+ noveltyScore
+ attentionScore
= score

scoreは必ず0〜100点です。

ジャンルによって評価軸を柔軟に変えてください。
芸能記事だから一律に低くする、
スポーツ記事だから一律に高くする、
という評価は禁止です。

記事本文に書かれている事実を根拠として評価してください。

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
${article.slice(0, 1800)}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 300,
    }, {
      timeout: 10000,
    });

    const rawContent =
  response.choices[0]?.message?.content ?? "{}";

console.log("AI生レスポンス:", rawContent);
console.log("AI生レスポンス型:", typeof rawContent);
console.log("AI生レスポンス長:", rawContent.length);
console.log("AI生レスポンスJSON化:", JSON.stringify(rawContent));

let result: any;

try {
  result = JSON.parse(rawContent);

  console.log("AI解析結果:", result);
  console.log("AI解析結果JSON:", JSON.stringify(result));
  console.log("AI解析結果keys:", Object.keys(result));

} catch (error) {
  console.error("AI JSON解析エラー:", error);
  console.error("解析対象:", rawContent);
  result = {};
}

console.log("AI解析JSON:", result);

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
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI NEWS ジャパンの「やんすAI」です。

Xで記事を開きたくなる強いフックを1行で作ってください。

【ルール】
・20〜55文字、1行
・記事本文と要約の事実だけ
・数字、逆転、急変、意外な事実を優先
・タイトルの言い換えは禁止
・最終結果や結論を言い切らない
・「ここからどうなった？」を残す
・「…」「やんすか？」は禁止
・自然なら「でやんす」を1回
・JSON、Markdown、URL、ハッシュタグは禁止

【理想】
「0-2から試合はまさかの展開へ、ラオスのMazda GBで起きたことがすごいでやんす」

「具体的な事実＋意外な展開＋答えを残す」
を意識してください。

記事の答えを全部書かず、読者が続きを知りたくなる一文にしてください。

タイトル：
${title}

要約：
${summary}

カテゴリ：
${category}

AI評価：
${score}点
`,
        },
        {
          role: "user",
          content: `
タイトル：
${title}

要約：
${summary}

この記事について、Xでクリックしたくなるフックを1行だけ作成してください。
`,
        },
      ],
      temperature: 0.85,
      max_tokens: 80,
    });

    let hook =
      response.choices[0]?.message?.content?.trim() ??
      "このニュース、ちょっと気になるでやんす！";

    hook = hook
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/^「|」$/g, "")
      .replace(/\n+/g, " ")
      .replace(/やんすか？/g, "")
      .replace(/やんすか\?/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // 万一AIがJSON形式で返した場合でも、
    // responseの中身だけを取り出す
    try {
      const parsed = JSON.parse(hook);
      if (parsed?.response) {
        hook = String(parsed.response).trim();
      }
    } catch {
      // 通常のテキストならそのまま使用
    }

    hook = hook
      .replace(/^「|」$/g, "")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!hook) {
      hook = "このニュース、ちょっと気になるでやんす！";
    }

    return hook;
  } catch (error) {
    console.error("やんすAIコメント生成エラー:", error);

    return "このニュース、ちょっと気になるでやんす！";
  }
}