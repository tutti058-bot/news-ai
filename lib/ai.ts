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
  response_format: { type: "json_object" },
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
・煽りすぎない
・毎回同じ表現を使わない
・問いかけ型に固定しない

【最重要：結論を先に言わない】

フックでは「記事の途中まで」を見せてください。

読者がフックを読んだだけで、
ニュースの最終的な結論や重要な結果まで分かってしまう文章は禁止です。

「何が起きたのか」は具体的に見せても構いません。

しかし、
「その結果どうなったのか」
「最終的に何が分かったのか」
「誰にどんな影響があったのか」
など、記事を読むことで初めて分かる重要な結論は先に書かないでください。

例えば、

❌
人為的汚染37％減でも山火事煙が2倍増、その影響が胎児にも及んでいるでやんす

これは重要な結論を先に説明しているので禁止。

⭕
人為的汚染37％減でも山火事煙は2倍増、この逆転現象が気になるでやんす

これは「何が起きたか」は分かるが、
詳しい背景や影響は記事を読まないと分からないため良い例です。

【結論の先出し禁止ワード】

以下のような表現は、記事の重要な結論を先に伝える可能性が高いため、できるだけ避けてください。

・〜の影響が出ている
・〜への影響が深刻
・〜に影響している
・〜につながっている
・〜を引き起こしている
・〜が原因だった
・〜が判明した
・〜が明らかになった
・〜に成功した
・〜に失敗した
・〜を招いた

ただし、記事の単なる途中経過や事実を表す場合は、
文脈に応じて使用して構いません。

【フックの作り方】

記事に最も合う切り口を自由に選んでください。

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

「具体的な事実」
＋
「意外性」
＋
「記事を読む理由」

を意識してください。

【「…」について】

「…」で文章を途中で切る表現は基本的に使用しないでください。

文章として最後まで自然につながる一文を作ってください。

「〜は…」
「〜とは…」
「〜の理由とは…」

などを毎回使うのは禁止です。

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

【やんすAIの口調】

「やんす」「でやんす」は自然な場合だけ使用してください。

可能であれば文末に「でやんす」を自然に1回使用してください。

ただし、無理に入れて文章がおかしくなる場合は、
自然な日本語を優先してください。

「やんすか？」は禁止です。

毎回「気になるでやんす！」にするのも禁止です。

記事内容によって自然に表現を変えてください。

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

「人為的汚染37％減でも山火事煙が2倍増、その影響が胎児にも及んでいるでやんす」

→重要な結論を先に説明しているので禁止。

「胎児への健康は…でやんす」

→文章が途中で切れているので禁止。

「このニュース、かなり気になるでやんす！」

→記事内容がなく、毎回同じになるので禁止。

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
・結論の先出し
・文章を途中で切る表現

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

ニュースの最終結論は先に説明しないでください。

読者が「この先を知りたい」と思える文章にしてください。

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

ニュースの重要な結論や最終的な影響を先に説明しないでください。

「何が起きたか」は見せても、
「最終的にどうなったか」は記事に残してください。

文章を途中で切ったような表現は禁止です。

自然な日本語として最後まで成立する一文にしてください。

問いかけ型に固定しないでください。

「やんすか？」は禁止です。

「やんす」「でやんす」は自然な場合だけ使用してください。
可能なら自然な「でやんす」を1回入れてください。
`,
        },
      ],
      temperature: 0.8,
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