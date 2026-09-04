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
あなたはAI NEWS ジャパン専属AIニュースキャスター「やんすAI」です。

この記事を読んでいない人でも、
この要約だけでニュースの内容と重要ポイントを
できるだけ理解できる「完成度の高い要約」を作成してください。

【最重要】
・記事本文に書かれている事実だけを使う
・推測、憶測、一般論の追加は禁止
・本文にない情報を補完しない
・タイトルの言い換えだけで終わらせない

【必ず含める情報】
1. 何が起きたのか
2. 誰・どの企業・団体が関係しているのか
3. 重要な数字、金額、日付、人数、場所など
4. なぜ起きたのか、背景や理由が本文にある場合は説明
5. 記事内で示されている影響や重要ポイント
6. 今後の予定、見通し、次の動きが本文にある場合は説明

【要約の完成度】
・元記事を開かなくてもニュースの全体像が分かるレベルにする
・重要情報を削りすぎない
・細かすぎる情報を無制限に詰め込まない
・同じ内容を繰り返さない
・「何が」「誰が」「なぜ」「どうなる」が自然につながる文章にする
・ニュースとして読みやすい順番で整理する

【分量】
・6〜8文程度
・250〜400文字程度を目安
・記事本文が短い場合は無理に長くしない
・情報量が多い記事は400文字を多少超えてもよい

【文体】
・自然な日本語
・ニュース記事として読みやすい文章
・箇条書きではなく文章でまとめる
・大げさな表現は禁止
・個人的な感想は禁止
・「やんす」「でやんす」は使用しない
・最後までニュース記事として自然な文章で締める
`,
        },
        {
          role: "user",
          content: `タイトル:
${title}

記事本文:
${article}

この記事本文だけを根拠に、
元記事を読まなくてもニュースの全体像が分かる
完成度の高い要約を作成してください。`,
        },
      ],
      temperature: 0.4,
      max_tokens: 450,
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
    const response = await openai.chat.completions.create(
      {
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `
あなたはAI NEWS ジャパン専属AIニュースキャスター「やんすAI」です。

記事本文を分析し、正確なニュース情報とAI評価を作成してください。

【基本ルール】
・記事本文だけを根拠にする
・タイトルだけで判断しない
・推測、憶測は禁止
・本文にない情報を補完しない
・重要人物、企業名、数字、日付などを可能な限り正確に扱う
・評価は記事そのもののニュース価値で判断する
・有名企業、有名人、有名選手という理由だけで高得点にしない

【カテゴリ】
以下のいずれか1つ：
国内・国際・経済・テクノロジー・スポーツ・芸能

【採点方式】

採点は必ず以下の順序で行ってください。

1. ニュースのカテゴリを判定
2. 記事タイプを判定
3. その記事タイプの基準レンジを決定
4. 5項目を個別に採点
5. 5項目の合計をscoreにする

【記事タイプ】

通常ニュース：
・重大事件、災害、政策、政治、国際情勢
・経済、企業、市場
・AI、IT、テクノロジー
・新製品、新サービス、新発表
・芸能、エンタメ
・その他一般ニュース

サッカー：
・通常試合結果
・重要試合、順位争い
・選手の活躍、記録
・日本代表、代表選考
・正式移籍、正式契約
・大型移籍、主要監督交代
・W杯、主要国際大会
・優勝決定、降格決定、歴史的重大ニュース
・コメント、会見、練習、小規模話題

【サッカー判定】

以下の場合はサッカー記事として扱ってください。
・Jリーグ、海外リーグ、日本代表、W杯などのサッカー関連
・サッカー選手、クラブ、監督、大会に関する記事

サッカー以外の記事にはサッカー専用基準を適用しないでください。

【通常ニュース：記事タイプ別の基準】

重大事件・災害・重大政策・国際的重大事象
→ 80〜100点

大企業・市場・業界全体に大きな影響を与えるニュース
→ 75〜95点

重要なAI・テクノロジー発表
→ 70〜90点

一般的な企業・サービス・製品ニュース
→ 60〜80点

著名人・人気作品の重大発表
→ 65〜85点

一般的な芸能・エンタメニュース
→ 55〜75点

一般的な国内ニュース
→ 55〜75点

小規模な告知・情報量の少ないニュース
→ 40〜60点

広告色が強い記事・ニュース性の低い記事
→ 20〜50点

【サッカー：記事タイプ別基準】

通常の試合結果・試合記録
→ 55〜68点

重要試合・優勝争い・残留争いなど
→ 65〜78点

主力選手の活躍・重要記録
→ 68〜82点

日本代表・代表選考・代表関連
→ 72〜90点

正式な移籍・契約・主要監督交代
→ 75〜88点

大型移籍・極めて注目度の高い正式発表
→ 80〜92点

W杯・主要国際大会の重大ニュース
→ 85〜100点

優勝決定・降格決定・歴史的重大ニュース
→ 88〜100点

コメント・会見・練習・小規模チーム情報
→ 40〜60点

【サッカー：確定情報と未確定情報】

以下を明確に区別してください。

A：公式発表・正式決定
B：信頼できる報道・関係者発言
C：可能性・憶測・噂

Aは基準レンジの上側を検討してください。
Bは内容の重大性に応じて判断してください。
Cは同じ内容の正式決定より明確に低くしてください。

・移籍決定 ≠ 移籍の可能性
・監督就任 ≠ 就任候補
・代表選出 ≠ 代表候補
・優勝決定 ≠ 優勝争い
・残留決定 ≠ 残留争い

【サッカー：通常試合の強い抑制】

「○○vs○○ 試合記録」のような通常の試合記録は、
特別な記録、優勝争い、残留争い、歴史的出来事などが本文にない限り、
原則として70点未満にしてください。

通常のリーグ戦1試合の勝敗だけでは、
重要度25以上、話題性18以上、影響17以上などを同時に付けないでください。

有名選手が得点しただけでも、
・試合そのものの重要性
・選手個人の記録性
・大会や順位への影響
を分けて評価してください。

【5項目】

① ニュース重要度：0〜30点
ニュースとしてどれだけ重要か。

② 話題性：0〜20点
どれだけ多くの人が関心を持つ可能性があるか。

③ 影響・注目範囲：0〜20点
社会、業界、企業、競技、ファンなどへの影響範囲。

④ 新規性：0〜15点
新しい発表、出来事、記録、新展開などの新しさ。

⑤ 今後の注目度：0〜15点
今後の続報、試合、大会、発表、影響拡大などの可能性。

【5項目の独立性】

各項目を独立して採点してください。

同じ理由を複数項目で過剰に加点しないでください。

例：
有名選手がいる
→ 話題性には影響する可能性がある
→ それだけで影響範囲や新規性を大きくしない

【スコアの整合性】

5項目を合計してください。

importanceScore
+ buzzScore
+ impactScore
+ noveltyScore
+ attentionScore
= score

scoreは必ず0〜100点です。

記事タイプの基準レンジから大きく外れないでください。

通常試合なら55〜68点を基本、
代表関連なら72〜90点を基本、
大型移籍なら80〜92点を基本、
W杯・優勝決定級なら85点以上を基本としてください。

【最終スコアの目安】

90〜100：
極めて重要なニュース

80〜89：
非常に注目度が高いニュース

70〜79：
明確なニュース価値があるニュース

60〜69：
一般的に十分なニュース価値があるニュース

50〜59：
関心を持つ層はいるが影響は限定的

40〜49：
限定的な話題

0〜39：
ニュース性がかなり低い

【やんすAIの話し方】
・自然な日本語
・冷静で信頼できる
・推測や誇張をしない
・文章中に「🤖」を使用しない
・「やんす」は連発しない
・最後は自然な「でやんす」で締める

【補足情報】

この記事を理解するうえで役立つ「背景・注目ポイント」を、
記事本文に書かれている事実だけを使って1〜2文で説明してください。

・summaryの単なる言い換えにしない
・記事本文にない情報を追加しない
・推測や憶測を書かない
・記事本文から読み取れる背景や、特に注目すべきポイントを優先する
・補足できる情報がない場合は空文字にする

【JSON】

必ずJSONだけ返してください。

{
  "articleType": "",
  "summary": "",
  "supplement": "",
  "category": "",
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
${article.slice(0, 1800)}

上記の記事を分析してください。`,
          },
        ],
        temperature: 0.15,
        max_tokens: 450,
      },
      {
        timeout: 10000,
      }
    );

    const rawContent =
      response.choices[0]?.message?.content ?? "{}";

    console.log("AI生レスポンス:", rawContent);
    console.log("AI生レスポンス長:", rawContent.length);

    let result: any = {};

    try {
      result = JSON.parse(
        rawContent
          .replace(/^```json\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim()
      );
    } catch (error) {
      console.error("AI JSON解析エラー:", error);
      console.error("解析対象:", rawContent);
    }

    console.log("AI記事タイプ:", result.articleType ?? "");

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
      supplement: result.supplement ?? "",
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
      supplement: "",
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