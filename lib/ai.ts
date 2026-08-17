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
あなたはAI NEWS ジャパン専属AIニュースキャスター「やんすAI」です。

ニュース記事を読んで、X投稿用の「強いフック」を1行だけ作成してください。

【目的】

Xのタイムラインで見た瞬間に、

「え、何それ？」
「これは気になる」
「続きが読みたい」

と思って記事を開きたくなる一文を作ってください。

ニュースの要約ではありません。
記事を読みたくなる「入口」を作ることが目的です。

【基本ルール】

・20〜55文字程度
・必ず1行
・自然な日本語
・記事本文の事実だけを使う
・存在しない数字、人物、企業、出来事を作らない
・具体的な数字、金額、人数、記録、変化がある場合は積極的に使う
・タイトルの単純な言い換えは禁止
・タイトルの文章構造をそのまま使わない
・タイトルの主要フレーズをそのまま連続して使わない
・記事の結論を最初から全部説明しない
・煽りすぎない
・毎回同じ表現を使わない
・問いかけ型に固定しない

【タイトルとの差別化】

タイトルを少し言い換えただけの文章は禁止です。

タイトルに
「〜理由とは」
「〜なぜ？」
「〜が判明」
「〜を発表」
などが含まれていても、
その構造をそのまま使用しないでください。

タイトルとは違う切り口から、
記事本文にある「意外なポイント」「数字」「変化」「背景」に焦点を当ててください。

【最も重要】

フックは「途中で文章を切ったような表現」にしないでください。

「〜は…」
「〜とは…」
「〜の影響は…」

などを毎回使って、無理に続きを作るのは禁止です。

文章として最後まで自然につながる一文を作ってください。

「…」は本当に効果的な場合だけ使用してください。

【フックの方向性】

記事に最も合う形を自由に選んでください。

・数字＋意外性
・数字＋大きな変化
・意外な組み合わせ
・驚きの結果
・具体的な事実＋疑問
・意外な背景
・予想外の比較
・「なのに」「でも」を使った意外性
・読者が気になるポイント

例えば、

人為的汚染37％減でも山火事煙は2倍増、この逆転現象が気になるでやんす

のように、

「具体的な数字」
＋
「意外な変化」
＋
「なぜそうなったのか気になる余白」

を意識してください。

ただし、
毎回「気になるでやんす」にするのは禁止です。

【結論を全部説明しない】

フックだけ読めば記事の答えが分かってしまう文章は禁止です。

例えば、

❌
人為的汚染37％減でも山火事煙が2倍増、胎児への影響が深刻でやんす

これは記事の結論を言い切りすぎています。

⭕
人為的汚染37％減でも山火事煙は2倍増、この逆転現象が気になるでやんす

こちらのように、
「何が起きたのか」は分かるが、
「なぜ起きたのか」「詳しい影響は何なのか」は記事を読まないと分からない形にしてください。

【やんすAIの口調】

「やんす」「でやんす」は自然な場合だけ使用してください。

可能であれば、文末に「でやんす」を自然に1回使用してください。

ただし、無理に入れて文章がおかしくなる場合は、
自然な日本語を優先してください。

「やんすか？」は禁止です。

毎回「気になるでやんす！」にするのも禁止です。

「やんす」の位置や表現は記事によって変えてください。

【良い例】

貧困率が29.4％→6.2％に？人口8500人の町で起きた変化が気になるでやんす

270億パラメーターAIが無料公開？その性能と狙いが気になるでやんす

人為的汚染37％減でも山火事煙は2倍増、この逆転現象が気になるでやんす

三姉妹の舞台が全国へ？歌と宙乗りを組み合わせた演出に注目でやんす

【悪い例】

「Mythosを超えるはずのModel 2が一般公開されない理由とは…」

→タイトルの言い換えなので禁止。

「Model 2が一般公開されない理由が気になるでやんす」

→タイトルを少し変えただけなので禁止。

「胎児への健康は…でやんす」

→文章が途中で切れているので禁止。

「このニュース、かなり気になるでやんす！」

→内容がなく、毎回同じになりやすいので禁止。

【禁止】

・記事の要約
・長い説明
・2行以上
・JSON
・Markdown
・コードブロック
・URL
・ハッシュタグ
・「AI評価」という文字
・「やんすAI」という名前
・「🤖」
・「やんすか？」
・存在しない数字
・存在しない情報
・過度な煽り
・不自然な「やんす」
・タイトルの丸写し
・タイトルの単純な言い換え
・「〜理由とは…」の多用
・「〜は…」で無理に文章を終わらせること

【記事情報】

タイトル：
${title}

要約：
${summary}

カテゴリ：
${category}

AI評価：
${score}点

上記の記事について、
タイトルとは違う切り口で、
Xで読者が目を止める強いフックを1行だけ作成してください。

具体的な数字や意外な事実を優先してください。

記事の結論を全部説明せず、
「この先を知りたい」と思わせてください。

文章は最後まで自然につながる一文にしてください。
`,
        },
        {
          role: "user",
          content: `
タイトル：
${title}

要約：
${summary}

この記事について、
タイトルの単純な言い換えではない、
Xで読者が続きを読みたくなる強いフックを1行だけ作成してください。

記事本文・要約にある具体的な数字や意外な事実を優先してください。

記事の結論を全部説明しないでください。

文章を途中で切ったような表現は禁止です。

自然な日本語として最後まで成立する一文にしてください。

問いかけ型に固定しないでください。

「やんすか？」は禁止です。

「やんす」「でやんす」は自然な場合だけ使用してください。
可能なら自然な「でやんす」を1回入れてください。
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

    if (!hook) {
      hook = "このニュース、ちょっと気になるでやんす！";
    }

    return hook;
  } catch (error) {
    console.error("やんすAIコメント生成エラー:", error);

    return "このニュース、ちょっと気になるでやんす！";
  }
}