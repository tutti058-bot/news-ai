import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { analyzeArticle, generateIndependentAnalysis } from "@/lib/ai";
import { generateLineNewsImage, saveLineNewsSourceImage } from "@/lib/services/line-news-image";
import { getArticle, getArticleImage } from "@/lib/getArticle";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ExtractedNews = {
  sourceType: string;
  sourceName: string;
  title: string;
  postText: string;
  author: string;
  publishedAt: string;
  metrics: {
    likes: number | null;
    reposts: number | null;
    replies: number | null;
    views: number | null;
  };
  facts: string[];
  visualDescription: string;
  urls: string[];
  confidence: string;
  sourceImageUrl?: string;
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}


async function extractUrlsFromLineImage(
  imageUrl: string,
  text: string | null
): Promise<string[]> {
  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
添付されたスクリーンショットを確認してください。

目的は「画像内に表示されているURL・リンク先URLの抽出」だけです。

【ルール】
・画像内に実際に表示されているURLだけを抽出する
・推測でURLを作らない
・完全なURLが読める場合は https:// または http:// から始まる形で返す
・ドメインだけしか読めない場合は無理にURL化しない
・短縮URLも、画像に読める状態で表示されている場合はそのまま返す
・URLが見つからなければ空配列にする
・日本語禁止
・JSONのみ返す

LINE補足テキスト：
${text ?? ""}

返却形式：
{
  "urls": []
}
`,
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "high",
            },
          ],
        },
      ],
    });

    const raw = response.output_text?.trim() ?? "";

    let parsed: { urls?: unknown[] };

    try {
      parsed = JSON.parse(
        raw
          .replace(/^```json\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim()
      );
    } catch {
      console.error("[line-pipeline] URL専用解析のJSON解析に失敗");
      return [];
    }

    const urls = Array.isArray(parsed.urls)
      ? parsed.urls.filter(
          (value): value is string =>
            typeof value === "string" &&
            (value.trim().startsWith("http://") ||
              value.trim().startsWith("https://"))
        )
      : [];

    return [...new Set(urls.map((url) => url.trim()))];
  } catch (error) {
    console.error("[line-pipeline] URL専用解析エラー", error);
    return [];
  }
}

async function analyzeLineImage(inboxId: number, imageUrl: string, text: string | null, sourceUrl: string | null): Promise<ExtractedNews> {
  const prompt = `
あなたはAI NEWSジャパンの記事素材抽出AIです。

添付画像は、Xの投稿、ニュース記事、LINEニュース、SNS投稿などを撮影したスクリーンショットです。

画像を注意深く読み取り、
「記事化の根拠として画像から確認できる情報」だけを抽出してください。

【絶対ルール】

1. 画像に書かれていない情報を推測しない。
2. 人物名、企業名、商品名、数字、日付などは読めたものだけ使う。
3. 判別できない文字は無理に補完しない。
4. SNSの投稿本文と、画面UI上の数字を区別する。
5. いいね数・リポスト数・返信数・表示数は、画像上で確認できた場合だけ数字を入れる。
6. 投稿者名が読めた場合は記録する。
7. URLが読めた場合は記録する。
8. 写真そのものから人物名や場所を勝手に断定しない。
9. 「画像から確認できる事実」と「推測」を混ぜない。
10. 分からないものは空文字、空配列、nullにする。
11. 日本語で返す。
12. JSONのみ返す。

LINE補足テキスト：
${text ?? ""}

LINEに記録されているURL：
${sourceUrl ?? ""}

JSON形式：
{
  "sourceType": "X|ニュース|LINEニュース|その他|不明",
  "sourceName": "",
  "title": "",
  "postText": "",
  "author": "",
  "publishedAt": "",
  "metrics": {
    "likes": null,
    "reposts": null,
    "replies": null,
    "views": null
  },
  "facts": [],
  "visualDescription": "",
  "urls": [],
  "confidence": "high|medium|low"
}
`;

  await prisma.lineInboxItem.update({
    where: { id: inboxId },
    data: {
      status: "analyzing",
      error: null,
    },
  });

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: prompt,
          },
          {
            type: "input_image",
            image_url: imageUrl,
            detail: "high",
          },
        ],
      },
    ],
  });

  const raw = response.output_text?.trim() ?? "";

  let parsed: Partial<ExtractedNews>;

  try {
    parsed = JSON.parse(
      raw
        .replace(/^```json\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim()
    );
  } catch (error) {
    console.error("[line-pipeline] 解析JSONエラー", error);

    await prisma.lineInboxItem.update({
      where: { id: inboxId },
      data: {
        status: "error",
        error: "AI解析結果のJSON解析に失敗しました",
      },
    });

    throw new Error("AI解析結果のJSON解析に失敗しました");
  }

  // 通常解析でURLが取れなかった場合だけ、URL抽出専用解析を実行
  if (!Array.isArray(parsed.urls) || parsed.urls.length === 0) {
    const fallbackUrls = await extractUrlsFromLineImage(
      imageUrl,
      text
    );

    if (fallbackUrls.length > 0) {
      console.log(
        "[line-pipeline] URL専用解析でURLを取得:",
        fallbackUrls
      );
      parsed.urls = fallbackUrls;
    } else {
      console.log(
        "[line-pipeline] スクショからURLを取得できませんでした"
      );
    }
  }

  const result: ExtractedNews = {
    sourceType: cleanString(parsed.sourceType) || "不明",
    sourceName: cleanString(parsed.sourceName),
    title: cleanString(parsed.title),
    postText: cleanString(parsed.postText),
    author: cleanString(parsed.author),
    publishedAt: cleanString(parsed.publishedAt),
    metrics: {
      likes: cleanNullableNumber(parsed.metrics?.likes),
      reposts: cleanNullableNumber(parsed.metrics?.reposts),
      replies: cleanNullableNumber(parsed.metrics?.replies),
      views: cleanNullableNumber(parsed.metrics?.views),
    },
    facts: Array.isArray(parsed.facts)
      ? parsed.facts.filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0
        )
      : [],
    visualDescription: cleanString(parsed.visualDescription),
    urls: Array.isArray(parsed.urls)
      ? parsed.urls.filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0
        )
      : [],
    confidence:
      parsed.confidence === "high" ||
      parsed.confidence === "medium" ||
      parsed.confidence === "low"
        ? parsed.confidence
        : "low",
  };

  return result;
}


async function analyzeLineUrl(
  inboxId: number,
  sourceUrl: string,
  text: string | null
): Promise<ExtractedNews> {
  const articleText = await getArticle(sourceUrl);

  if (!articleText) {
    await prisma.lineInboxItem.update({
      where: { id: inboxId },
      data: {
        status: "error",
        error: "URLからニュース本文を取得できませんでした",
      },
    });

    throw new Error("URLからニュース本文を取得できませんでした");
  }

  const prompt = `
あなたはAI NEWSジャパンの記事素材抽出AIです。

以下は、LINEで送信されたニュースURLから取得した本文です。

URL：
${sourceUrl}

本文：
${articleText}

LINE補足テキスト：
${text ?? ""}

取得した本文に明確に記載されている情報だけを整理してください。

【絶対ルール】
1. 本文にない情報を推測しない。
2. 人物名、企業名、商品名、数字、日付などは本文にあるものだけ使う。
3. 不明な情報は空文字、空配列、nullにする。
4. 本文の内容と推測を混ぜない。
5. 日本語で返す。
6. JSONのみ返す。

JSON形式：
{
  "sourceType": "ニュース",
  "sourceName": "",
  "title": "",
  "postText": "",
  "author": "",
  "publishedAt": "",
  "metrics": {
    "likes": null,
    "reposts": null,
    "replies": null,
    "views": null
  },
  "facts": [],
  "visualDescription": "",
  "urls": ["${sourceUrl}"],
  "confidence": "high|medium|low"
}
`;

  await prisma.lineInboxItem.update({
    where: { id: inboxId },
    data: {
      status: "analyzing",
      error: null,
    },
  });

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });

  const raw = response.output_text?.trim() ?? "";

  let parsed: Partial<ExtractedNews>;

  try {
    parsed = JSON.parse(
      raw
        .replace(/^```json\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim()
    );
  } catch (error) {
    console.error("[line-pipeline] URL解析JSONエラー", error);

    await prisma.lineInboxItem.update({
      where: { id: inboxId },
      data: {
        status: "error",
        error: "URL解析結果のJSON解析に失敗しました",
      },
    });

    throw new Error("URL解析結果のJSON解析に失敗しました");
  }

  return {
    sourceType: cleanString(parsed.sourceType) || "ニュース",
    sourceName: cleanString(parsed.sourceName),
    title: cleanString(parsed.title),
    postText: cleanString(parsed.postText),
    author: cleanString(parsed.author),
    publishedAt: cleanString(parsed.publishedAt),
    metrics: {
      likes: cleanNullableNumber(parsed.metrics?.likes),
      reposts: cleanNullableNumber(parsed.metrics?.reposts),
      replies: cleanNullableNumber(parsed.metrics?.replies),
      views: cleanNullableNumber(parsed.metrics?.views),
    },
    facts: Array.isArray(parsed.facts)
      ? parsed.facts.filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0
        )
      : [],
    visualDescription: cleanString(parsed.visualDescription),
    urls: Array.isArray(parsed.urls)
      ? parsed.urls.filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0
        )
      : [sourceUrl],
    confidence:
      parsed.confidence === "high" ||
      parsed.confidence === "medium" ||
      parsed.confidence === "low"
        ? parsed.confidence
        : "low",
  };
}


function extractXPostId(url: string): string | null {
  const match = url.match(
    /(?:x\.com|twitter\.com)\/[^/]+\/status\/(\d+)/i
  );

  return match?.[1] ?? null;
}

async function analyzeLineXUrl(
  inboxId: number,
  sourceUrl: string,
  text: string | null
): Promise<ExtractedNews> {
  const postId = extractXPostId(sourceUrl);

  if (!postId) {
    await prisma.lineInboxItem.update({
      where: { id: inboxId },
      data: {
        status: "error",
        error: "X投稿URLから投稿IDを取得できませんでした",
      },
    });

    throw new Error("X投稿URLから投稿IDを取得できませんでした");
  }

  if (!process.env.X_Bearer_Token) {
    await prisma.lineInboxItem.update({
      where: { id: inboxId },
      data: {
        status: "error",
        error: "X_Bearer_Tokenが設定されていません",
      },
    });

    throw new Error("X_Bearer_Tokenが設定されていません");
  }

  await prisma.lineInboxItem.update({
    where: { id: inboxId },
    data: {
      status: "analyzing",
      error: null,
    },
  });

  const params = new URLSearchParams({
    "tweet.fields":
      "created_at,public_metrics,author_id,lang,attachments",
    expansions:
      "author_id,attachments.media_keys",
    "user.fields":
      "name,username,public_metrics",
    "media.fields":
      "media_key,type,url,preview_image_url",
  });

  const response = await fetch(
    `https://api.x.com/2/tweets/${postId}?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.X_Bearer_Token}`,
      },
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok || !data?.data) {
    console.error(
      "[line-pipeline] X投稿取得失敗",
      response.status,
      data
    );

    await prisma.lineInboxItem.update({
      where: { id: inboxId },
      data: {
        status: "error",
        error:
          data?.detail ??
          data?.title ??
          "X投稿の取得に失敗しました",
      },
    });

    throw new Error(
      data?.detail ??
        data?.title ??
        "X投稿の取得に失敗しました"
    );
  }

  const tweet = data.data;
  const users = Array.isArray(data.includes?.users)
    ? data.includes.users
    : [];

  const author = users.find(
    (user: { id?: string }) =>
      user.id === tweet.author_id
  );

  const metrics = tweet.public_metrics ?? {};

  const media = Array.isArray(data.includes?.media)
    ? data.includes.media
    : [];

  const firstMediaKey =
    Array.isArray(tweet.attachments?.media_keys)
      ? tweet.attachments.media_keys[0]
      : null;

  const sourceImageUrl =
    media.find(
      (item: {
        media_key?: string;
        type?: string;
        url?: string;
        preview_image_url?: string;
      }) => item.media_key === firstMediaKey
    )?.url ??
    media.find(
      (item: {
        media_key?: string;
        type?: string;
        url?: string;
        preview_image_url?: string;
      }) => item.media_key === firstMediaKey
    )?.preview_image_url ??
    null;

  const prompt = `
あなたはAI NEWSジャパンの記事素材抽出AIです。

以下はX APIから取得した実際の投稿データです。

投稿URL：
${sourceUrl}

投稿本文：
${tweet.text ?? ""}

投稿日時：
${tweet.created_at ?? ""}

投稿者：
${author?.name ?? ""} (@${author?.username ?? ""})

いいね：
${metrics.like_count ?? "不明"}

リポスト：
${metrics.retweet_count ?? "不明"}

返信：
${metrics.reply_count ?? "不明"}

表示数：
${metrics.impression_count ?? "不明"}

LINE補足：
${text ?? ""}

【絶対ルール】
1. X APIで取得した情報だけを事実として扱う。
2. 投稿本文に書かれていない出来事を推測しない。
3. 投稿者名、ユーザー名、数字、日時は取得できた値だけ使う。
4. いいね・リポスト・返信・表示数はAPIで取得できた値だけ使う。
5. 投稿本文から人物や企業の意図を推測しない。
6. 日本語で返す。
7. JSONのみ返す。

JSON形式：
{
  "sourceType": "X",
  "sourceName": "",
  "title": "",
  "postText": "",
  "author": "",
  "publishedAt": "",
  "metrics": {
    "likes": null,
    "reposts": null,
    "replies": null,
    "views": null
  },
  "facts": [],
  "visualDescription": "",
  "urls": ["${sourceUrl}"],
  "confidence": "high|medium|low"
}
`;

  const aiResponse = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });

  const raw = aiResponse.output_text?.trim() ?? "";

  let parsed: Partial<ExtractedNews>;

  try {
    parsed = JSON.parse(
      raw
        .replace(/^```json\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim()
    );
  } catch (error) {
    console.error(
      "[line-pipeline] X URL解析JSONエラー",
      error
    );

    await prisma.lineInboxItem.update({
      where: { id: inboxId },
      data: {
        status: "error",
        error: "X投稿解析結果のJSON解析に失敗しました",
      },
    });

    throw new Error(
      "X投稿解析結果のJSON解析に失敗しました"
    );
  }

  return {
    sourceType: "X",
    sourceName:
      cleanString(parsed.sourceName) ||
      "X",
    title: cleanString(parsed.title),
    postText:
      cleanString(parsed.postText) ||
      cleanString(tweet.text),
    author:
      cleanString(parsed.author) ||
      (author?.name
        ? `${author.name} (@${author.username ?? ""})`
        : ""),
    publishedAt:
      cleanString(parsed.publishedAt) ||
      cleanString(tweet.created_at),
    metrics: {
      likes:
        cleanNullableNumber(
          parsed.metrics?.likes
        ) ??
        cleanNullableNumber(
          metrics.like_count
        ),
      reposts:
        cleanNullableNumber(
          parsed.metrics?.reposts
        ) ??
        cleanNullableNumber(
          metrics.retweet_count
        ),
      replies:
        cleanNullableNumber(
          parsed.metrics?.replies
        ) ??
        cleanNullableNumber(
          metrics.reply_count
        ),
      views:
        cleanNullableNumber(
          parsed.metrics?.views
        ) ??
        cleanNullableNumber(
          metrics.impression_count
        ),
    },
    facts: Array.isArray(parsed.facts)
      ? parsed.facts.filter(
          (value): value is string =>
            typeof value === "string" &&
            value.trim().length > 0
        )
      : [],
    visualDescription:
      cleanString(
        parsed.visualDescription
      ),
    urls: [sourceUrl],
    confidence:
      parsed.confidence === "high" ||
      parsed.confidence === "medium" ||
      parsed.confidence === "low"
        ? parsed.confidence
        : "low",
    sourceImageUrl:
      typeof sourceImageUrl === "string"
        ? sourceImageUrl
        : undefined,
  };
}

async function generateLineArticle(
  inboxId: number,
  analysis: ExtractedNews,
  inbox: {
    imageUrl: string | null;
    sourceUrl: string | null;
    text: string | null;
  }
) {
  const facts = analysis.facts ?? [];
  const urls = analysis.urls ?? [];

  const articleResponse = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: `
あなたはAI NEWSジャパンの記事編集AIです。

以下は、LINEで受信したスクリーンショットをAI解析した結果です。

スクリーンショットに存在する事実だけを根拠に、
AI NEWSジャパン向けのニュース記事を作成してください。

【絶対ルール】

・解析結果にない情報を追加しない
・推測、憶測、一般論は禁止
・人物名、企業名、数字、日時などを勝手に補完しない
・SNS投稿そのものを記事本文として丸写ししない
・「何が起きたのか」「なぜ話題なのか」が分かる記事にする
・反応数はスクリーンショットに確認できる値だけ使う
・記事として自然な日本語にする
・スクリーンショットから確認できない背景情報は書かない
・ニュースとして成立するタイトルを新しく作る
・タイトルはSNS投稿文の単純なコピーにしない
・広告・宣伝のような表現は禁止

【タイトル生成の重要ルール】

・タイトルは「誰が言ったか」だけではなく、「何が起きたのか」「何が変わるのか」を最優先する

・ニュースの核心となる出来事をタイトル前半に置く

・スクリーンショットで確認できる具体的な固有名詞、数字、出来事、変化は積極的に使う

・「○○が発表」「○○がコメント」だけで終わる無難なタイトルは避け、何についての発表・コメントなのかまで具体化する

・読者がタイトルだけでニュースの概要を把握できるようにする

・元のSNS投稿よりも、ニュース記事として情報が整理されたタイトルにする

・タイトルは20〜35文字程度を基本とする

・長くても40文字程度までとする

・短くできる場合は、短いタイトルを優先する

・文字数を埋めるために不要な情報を追加しない

・Xやニュースアプリで見たとき、一瞬で内容が分かる短いタイトルを優先する

・ニュース記事として堅く整えすぎず、Xで自然な少しラフな表現も使用してよい

・「○○さん」「○○すぎる」なども、事実と矛盾しない範囲で使用してよい

・タイトルを強くするために、スクリーンショットにない情報を推測して追加してはいけない
・煽情的な表現、「衝撃」「驚き」「ヤバい」など根拠のない感情表現は禁止
・事実以上に重大に見せる表現は禁止
・「なぜ」「どうなる」などの疑問形は、スクリーンショット内の事実だけで成立する場合に限る
・最もニュース性の高い事実を1つ選び、それをタイトルの中心にする
・タイトル候補を内部で複数検討したうえで、最も具体的でニュース性の高いものを1つ返す
・タイトルに入れる情報は、解析結果で明確に確認できる事実だけに限定する
・本文から推測できる内容、一般的な背景知識、将来の予測、人物や組織の意図はタイトルに追加しない
・「解散前」「重大な転機」「異例の事態」など、スクリーンショットに明確な根拠がない意味づけは禁止
・「話題に」「注目を集める」などの抽象的な表現より、確認できる具体的な出来事や数字を優先する
・反応数や表示数が確認できる場合は、ニュース性を示す具体的な数字として利用してよい
・複数の事実を無理に詰め込まず、最も重要な出来事を中心に簡潔にまとめる
・タイトルだけを読んだ読者に、スクリーンショットから確認できない事実を想像させる表現を使わない
・タイトル生成では「強い表現」より「具体的な事実」を優先する
・最終的に、事実性、具体性、ニュース性、読みやすさの4点を満たすタイトルを1つだけ返す

【記事構成】

title:

ニュースとして読める見出し。

・20〜35文字程度を基本とする
・長くても40文字程度までとする
・短くできる場合は短いタイトルを優先する
・文字数を埋めるために不要な情報を追加しない
・Xやニュースアプリで見たとき、一瞬で内容が分かる短いタイトルを優先する
・ニュース記事として堅く整えすぎず、少しラフで自然な表現も使用してよい
・「○○さん」「○○すぎる」なども、事実と矛盾しない範囲で使用してよい

article:

400〜800文字程度。

・タイトルですでに伝えている内容を、本文冒頭でそのまま繰り返さない
・タイトルの単純な言い換えから本文を始めない
・タイトルで省略した具体的な情報を優先して書く
・商品名、日時、価格、内容、背景、SNS上の反応など、確認できる追加情報があれば入れる
・読者に説明が必要な場合は、出来事の背景や意味を簡潔に説明する
・追加情報が少ない場合は、無理に文章を膨らませない
・SNS投稿そのものの丸写しはしない
・ラフで読みやすいニュース文体にする

基本構成は「タイトルで核心を伝える → 本文で具体的な詳細・背景・反応を補足」とする。

出来事→内容→反応の順を基本とするが、タイトルと重複する場合は順番を調整してよい。

source:
X / LINEニュース / ニュース / その他

JSONのみ返してください。

{
  "title": "",
  "article": "",
  "source": ""
}

【解析結果】

種別:
${analysis.sourceType}

ソース:
${analysis.sourceName}

タイトル候補:
${analysis.title}

投稿本文:
${analysis.postText}

投稿者:
${analysis.author}

投稿日:
${analysis.publishedAt}

いいね:
${analysis.metrics.likes ?? "不明"}

リポスト:
${analysis.metrics.reposts ?? "不明"}

返信:
${analysis.metrics.replies ?? "不明"}

表示数:
${analysis.metrics.views ?? "不明"}

確認できた事実:
${facts.join("\n")}

画像内容:
${analysis.visualDescription}

確認できたURL:
${urls.join("\n")}

LINE補足:
${inbox.text ?? ""}
`,
  });

  const raw = articleResponse.output_text?.trim() ?? "";

  let generated: {
    title?: string;
    article?: string;
    source?: string;
  };

  try {
    generated = JSON.parse(
      raw
        .replace(/^```json\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim()
    );
  } catch {
    throw new Error("記事生成AIのJSON解析に失敗しました");
  }

  const title = String(generated.title ?? "").trim();
  const article = String(generated.article ?? "").trim();

  if (!title || !article) {
    throw new Error("記事タイトルまたは本文を生成できませんでした");
  }

  const ai = await analyzeArticle(title, article, {
    sourceType: analysis.sourceType,
    postText: analysis.postText,
    facts: analysis.facts,
    likes: analysis.metrics.likes,
    reposts: analysis.metrics.reposts,
    replies: analysis.metrics.replies,
    views: analysis.metrics.views,
  });

  if (!ai.summary) {
    throw new Error("記事AI分析に失敗しました");
  }

  const independentAnalysis = await generateIndependentAnalysis(
    title,
    article
  );

  const source =
    analysis.sourceType === "X"
      ? "X"
      : analysis.sourceName ||
        analysis.sourceType ||
        "LINE";

  const sourceUrl =
    urls[0] ||
    inbox.sourceUrl ||
    `line://inbox/${inboxId}`;

  const createdNews = await prisma.news.create({
    data: {
      title,
      content: article,
      summary: ai.summary,
      supplement: ai.supplement,
      analysisLabel: independentAnalysis.analysisLabel,
      analysis: independentAnalysis.analysis,
      category: ai.category,
      score: ai.score,
      importanceScore: ai.importanceScore,
      buzzScore: ai.buzzScore,
      impactScore: ai.impactScore,
      noveltyScore: ai.noveltyScore,
      attentionScore: ai.attentionScore,
      image: null,
      source,
      sourceUrl,
      publishedAt: null,
    },
    select: {
      id: true,
      title: true,
      summary: true,
      supplement: true,
      category: true,
      score: true,
    },
  });

  let generatedImage: string | null = null;

  try {
    // ① 元記事のOGP / main画像を最優先で取得
    if (sourceUrl.startsWith("http")) {
      const articleImageUrl = await getArticleImage(sourceUrl);

      if (articleImageUrl) {
        console.log(
          "[line-pipeline] 元記事画像を使用します:",
          articleImageUrl
        );

        generatedImage = await saveLineNewsSourceImage(
          createdNews.id,
          articleImageUrl
        );
      }
    }

    // ② 元記事画像が取得できなかった場合だけ、従来のAI画像生成
    if (!generatedImage) {
      console.log(
        "[line-pipeline] 元記事画像が使えないためAI画像を生成します"
      );

      generatedImage = await generateLineNewsImage(
        createdNews.id,
        analysis.sourceImageUrl ?? inbox.imageUrl
      );
    }
  } catch (imageError) {
    console.error("[line-pipeline] 画像処理失敗", imageError);
  }

  await prisma.lineInboxItem.update({
    where: { id: inboxId },
    data: {
      generatedNewsId: createdNews.id,
      status: "awaiting_approval",
      error: generatedImage
        ? null
        : "記事は生成されましたが画像生成に失敗しました",
    },
  });

  return {
    newsId: createdNews.id,
    title: createdNews.title,
    article,
    summary: createdNews.summary,
    supplement: createdNews.supplement,
    image: generatedImage,
  };
}

export async function processLineInboxItem(inboxId: number) {
  const inbox = await prisma.lineInboxItem.findUnique({
    where: { id: inboxId },
    select: {
      id: true,
      userId: true,
      type: true,
      text: true,
      sourceUrl: true,
      imageUrl: true,
      status: true,
      generatedNewsId: true,
    },
  });

  if (!inbox) {
    throw new Error("LINE受信データが見つかりません");
  }

  if (inbox.generatedNewsId) {
    return null;
  }

  if (!inbox.imageUrl && !inbox.sourceUrl) {
    await prisma.lineInboxItem.update({
      where: { id: inboxId },
      data: {
        status: "error",
        error: "画像またはニュースURLがありません。",
      },
    });
    throw new Error("画像またはニュースURLがありません");
  }

  if (
    inbox.status === "processing" ||
    inbox.status === "analyzing" ||
    inbox.status === "awaiting_approval" ||
    inbox.status === "published"
  ) {
    return null;
  }

  await prisma.lineInboxItem.update({
    where: { id: inboxId },
    data: {
      status: "processing",
      error: null,
    },
  });

  try {
    const analysis = inbox.imageUrl
      ? await analyzeLineImage(
          inbox.id,
          inbox.imageUrl,
          inbox.text,
          inbox.sourceUrl
        )
      : /(?:x\.com|twitter\.com)\/[^/]+\/status\/\d+/i.test(
          inbox.sourceUrl!
        )
        ? await analyzeLineXUrl(
            inbox.id,
            inbox.sourceUrl!,
            inbox.text
          )
        : await analyzeLineUrl(
            inbox.id,
            inbox.sourceUrl!,
            inbox.text
          );

    const result = await generateLineArticle(
      inbox.id,
      analysis,
      {
        imageUrl: inbox.imageUrl,
        sourceUrl: inbox.sourceUrl,
        text: inbox.text,
      }
    );

    console.log("[line-pipeline] 完了", result);

    return {
      ...result,
      userId: inbox.userId,
    };
  } catch (error) {
    console.error("[line-pipeline] 処理失敗", error);

    await prisma.lineInboxItem.update({
      where: { id: inboxId },
      data: {
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "LINE記事生成に失敗しました",
      },
    });

    throw error;
  }
}
