import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanText(value: unknown): string {
  if (typeof value !== "string") {
    return String(value ?? "");
  }

  let text = value.trim();

  for (let i = 0; i < 2; i++) {
    try {
      const parsed = JSON.parse(text);

      if (typeof parsed === "string") {
        text = parsed.trim();
        continue;
      }

      if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;

        const candidates = [
          obj.hook,
          obj.description,
          obj.result,
          obj.response,
          obj.content,
          obj.text,
          obj.message,
        ];

        const found = candidates.find(
          (v): v is string =>
            typeof v === "string" && v.trim().length > 0
        );

        if (found) {
          text = found.trim();
          continue;
        }
      }
    } catch {
      // 通常の文章
    }

    break;
  }

  return text
    .replace(/追加情報はリプへ👇/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .trim();
}

export async function generateXPostCandidates(news: {
  title: string;
  summary?: string | null;
  category?: string | null;
}): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
あなたはAI NEWSジャパンのX投稿編集AIです。

ニュース記事を読み、X向けの投稿文を4パターン作成してください。

【基本ルール】
・ニュース本文と要約にある事実だけを使う
・記事にない事実、数字、人物情報は禁止
・根拠のない予測は禁止
・過度な煽りは禁止
・ハッシュタグは禁止
・絵文字は禁止
・「です・ます」は使わない
・「でやんす」は使わない
・短く自然で、ラフに読める文章にする
・コメントや反応をしやすい余白を残す
・記事タイトルをそのまま貼り付けたような文章は禁止
・同じ内容を言い換えるだけの4案は禁止

【文字量】
原則、各案140文字以内。
ただし、ニュースが「事件→事件後→その後」のような明確な時系列を重要情報として含む場合だけ、140文字を超えてよい。
その場合も、時系列を簡潔に整理し、冗長にしない。

【4パターン】

4案は「同じニュースを別の言葉にしただけ」にしない。
4案それぞれで、書き出し・文章構造・伝えるポイントを変える。

4案同士で同じ主要事実を丸ごと繰り返さない。
4案を作る前に、記事内の重要な事実を複数整理し、
可能な範囲で各案が異なる事実・視点を中心にする。
同じ事実を4案すべての中心にしない。
4案を完成させた後、4案同士の重複を自己チェックする。
①と④が同じ数字・同じ中心事実・同じ情報順になっていた場合は、
④を書き直して別の事実を中心にする。
特に①で「約660万件」などの具体的な数字を使った場合、
④では原則として同じ数字を使わない。
④は「対応」「影響」「判明事項」「漏えいしていない情報」など、
記事内の別のポイントを優先する。
4案を並べて読んだとき、それぞれ違う投稿として成立しているか確認してから出力する。
記事に複数の重要事実がある場合は、案ごとに焦点をずらす。
特に1案目と4案目で、同じ事実を同じ順番で並べることは禁止。
1案目が事件・発表そのものを中心にした場合、
4案目は記事内の別の重要ポイントを中心にする。

1. ニュース型
ニュースの核心だけを最短で伝える。
「何が起きたか」を中心にし、1〜2個の重要事実までに絞る。
情報を詰め込みすぎず、記事全体を要約しない。
感想、問いかけ、煽りは禁止。
見出しを少し自然なX文章にしたような形にする。

2. ひとこと反応型
ニュースを見た瞬間の自然なリアクションとして書く。
必ずリアクション感のある書き出しにする。
「え、」「これは大きいな」「こういうことだったのか」「ちょっと気になる」など、
人がニュースを見て思わず口にするような自然な入り方を優先する。
「○○が発表」「○○で不正アクセス」など、ニュース見出しそのもので始めない。
疑問文・質問文は禁止。
「？」を使わない。
質問やコメントを促す役割は3案目に任せる。
リアクションの後には、記事内の事実を1つ程度だけ添える。
記事にない感情、評価、事実は追加しない。
単なるニュース要約を、少し言い換えただけの文章にはしない。
短く、Xで自然に読める文章にする。

3. コメント誘導型
記事の中から、読者が考えたり意見を言いやすい具体的な論点を1つ選ぶ。
その事実や状況を短く提示したあと、具体的な問いを置く。
「みんなはどう思う？」「どう思う？」など、
どんなニュースにも使える汎用的な質問は禁止。
「今後の対応は？」「利用者は何を確認すべき？」のように、
記事内容から自然に導ける具体的な問いにする。
問いは記事内の事実に直接つながる内容にする。
記事にない前提、答え、予測、評価は加えない。
質問を作るためにニュースの事実を誇張しない。

4. ニュースラベル型
1案目とは違う事実・ポイントを中心にする。
1案目で使用した数字・中心事実を原則として繰り返さない。
特に「約660万件」のように1案目で使った最重要の数字を、
④でそのまま再利用することは禁止。
1案目とは別の事実（被害内容、対応、影響、判明事項など）を優先する。
まず記事内の重要な事実を複数整理し、
1案目で中心にした事実とは別のポイントを1つ選んで書く。
1案目と同じ主要事実を丸ごと繰り返すことは禁止。
記事内に別の重要ポイントがある場合は、そちらを優先する。
別の事実がない場合も、1案目の全文を言い換えるだけにはしない。

記事内容に適している場合、冒頭にラベルを1つだけ付ける。

使用できるラベル：
【速報】【驚愕】【訃報】【朗報】【注目】【話題】【判明】【発表】

ラベルは記事内容に明確に適合する場合だけ使用する。
ラベルを付けるために事実を誇張してはいけない。

「速報」：
新たに発生・発表された速報性の高いニュース。

「驚愕」：
記事内に明確に驚きの大きい事実がある場合。

「訃報」：
死去が記事内で明確に確認できる場合。

「朗報」：
喜ばしい発表・結果など、記事内容から明確に判断できる場合。

「注目」：
記事内に特に注目すべきポイントがある場合。

「話題」：
実際に話題になっていることが記事内で確認できる場合。

「判明」：
新たに判明した事実を伝える場合。

「発表」：
企業・団体・人物などによる正式な発表を伝える場合。

基本形は「ラベル＋別の重要ポイント1つ」。
1案目と同じ事実を同じ順番で並べない。
情報を詰め込みすぎず、短い投稿として成立させる。
適切なラベルがない場合は、ラベルなしで作成する。

【重要】
・政治、事件、事故などを扱う場合も、事実関係を中立に表現する
・特定の人物や政党などを持ち上げたり貶めたりする表現は禁止
・「すごい」「ヤバい」「衝撃」など主観的な煽りは禁止
・記事にない未来予測は禁止
・URLは禁止

JSONのみ返してください。

{
  "candidates": ["", "", "", ""]
}
`,
      },
      {
        role: "user",
        content: `
タイトル：
${news.title}

要約：
${news.summary ?? ""}

カテゴリ：
${news.category ?? "国内"}
`,
      },
    ],
    temperature: 0.85,
    max_tokens: 900,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "x_image_post_candidates",
        strict: true,
        schema: {
          type: "object",
          properties: {
            candidates: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: { type: "string" },
            },
          },
          required: ["candidates"],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? "";

  let parsed: { candidates: string[] };

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("イメージ投稿候補の解析に失敗しました");
  }

  const candidates = Array.isArray(parsed.candidates)
    ? parsed.candidates
        .map(cleanText)
        .filter(Boolean)
        .slice(0, 4)
    : [];

  if (candidates.length < 4) {
    throw new Error("イメージ投稿の候補文を4案生成できませんでした");
  }

  return candidates;
}
