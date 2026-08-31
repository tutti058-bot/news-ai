import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type XTweet = {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
  public_metrics?: {
    retweet_count?: number;
    reply_count?: number;
    like_count?: number;
    quote_count?: number;
    impression_count?: number;
  };
};

type XUser = {
  id: string;
  name: string;
  username: string;
};

function createInitialQuery(title: string) {
  let text = title;

  text = text.replace(
    /\s*[-｜|]\s*(産経ニュース|NHK|NHKニュース|Yahoo!ニュース|スポーツ報知|スポニチ|日刊スポーツ|デイリースポーツ|ORICON NEWS|毎日新聞|朝日新聞|読売新聞).*$/i,
    ""
  );

  text = text
    .replace(/[「」『』【】（）()[\]]/g, " ")
    .replace(/[、。，．！？!?:：・]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, 60).trim();
}

async function createAiSearchQuery(
  title: string,
  summary: string | null,
  category: string | null
) {
  const response =
    await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたは日本ニュースをXで検索するための検索キーワード生成AIです。

ニュース記事のタイトルと要約を読み、
X検索で関連投稿を探しやすい検索語を作ってください。

目的はニュースタイトル全文を検索することではありません。

【重要】
ニュースの中心となる

・人物名
・企業名
・団体名
・商品名
・場所
・事件名
・大会名
・作品名

など、X上で実際に検索されそうな固有名詞を優先してください。

説明文や助詞は不要です。

検索語は2〜4個程度の重要語だけにしてください。

【例】

記事タイトル：
イオンモール熊本で2人死亡「ハビタ」が公式HPに謝罪文

検索語：
イオンモール熊本 ハビタ

記事タイトル：
大谷翔平が今季40号ホームラン

検索語：
大谷翔平 40号

記事タイトル：
Jリーグ浦和レッズが新外国人選手獲得を発表

検索語：
浦和レッズ 新外国人

必ずJSONだけ返してください。

{
  "query": "X検索用キーワード"
}
`,
        },
        {
          role: "user",
          content: `
タイトル：
${title}

要約：
${summary ?? ""}

カテゴリ：
${category ?? ""}
`,
        },
      ],
      temperature: 0.2,
      max_tokens: 60,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "x_search_query",
          strict: true,
          schema: {
            type: "object",
            properties: {
              query: {
                type: "string",
              },
            },
            required: ["query"],
            additionalProperties: false,
          },
        },
      },
    });

  const raw =
    response.choices[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(raw);

    if (
      typeof parsed.query === "string" &&
      parsed.query.trim()
    ) {
      return parsed.query.trim();
    }
  } catch {
    console.error(
      "AI検索キーワード解析失敗:",
      raw
    );
  }

  return "";
}

async function searchX(query: string) {
  const xUrl =
    "https://api.x.com/2/tweets/search/recent?" +
    new URLSearchParams({
      query: `${query} lang:ja -is:retweet`,
      max_results: "20",
      "tweet.fields":
        "created_at,public_metrics,author_id",
      expansions: "author_id",
      "user.fields": "name,username",
    }).toString();

  const response = await fetch(xUrl, {
    headers: {
      Authorization:
        `Bearer ${process.env.X_Bearer_Token}`,
    },
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail ??
        "X投稿の検索に失敗しました"
    );
  }

  return data;
}

function getSearchKeywords(query: string) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((keyword) =>
      keyword.replace(/[「」『』【】（）()[\]、。,.!?！？:：]/g, "")
    )
    .filter((keyword) => keyword.length >= 2);
}

function calculateRelevance(
  text: string,
  keywords: string[]
) {
  const normalizedText =
    text.toLowerCase();

  let matchedCount = 0;

  for (const keyword of keywords) {
    if (normalizedText.includes(keyword)) {
      matchedCount++;
    }
  }

  const keywordScore =
    matchedCount * 100;

  return {
    matchedCount,
    score: keywordScore,
  };
}

function formatResults(
  data: any,
  query: string
) {
  const users: XUser[] =
    data.includes?.users ?? [];

  const userMap = new Map(
    users.map((user) => [
      user.id,
      user,
    ])
  );

  const tweets: XTweet[] =
    data.data ?? [];

  const keywords =
    getSearchKeywords(query);

  return tweets
    .filter(
      (tweet) =>
        tweet.text &&
        tweet.public_metrics
    )
    .map((tweet) => {
      const user =
        userMap.get(tweet.author_id);

      const metrics =
        tweet.public_metrics ?? {};

      const relevance =
        calculateRelevance(
          tweet.text,
          keywords
        );

      const engagement =
        (metrics.impression_count ?? 0) * 0.01 +
        (metrics.like_count ?? 0) * 2 +
        (metrics.retweet_count ?? 0) * 3 +
        (metrics.reply_count ?? 0) +
        (metrics.quote_count ?? 0) * 2;

      return {
        id: tweet.id,
        text: tweet.text,
        createdAt:
          tweet.created_at ?? null,
        author: {
          id: tweet.author_id,
          name:
            user?.name ?? "不明",
          username:
            user?.username ?? "",
        },
        metrics: {
          impressions:
            metrics.impression_count ?? 0,
          likes:
            metrics.like_count ?? 0,
          reposts:
            metrics.retweet_count ?? 0,
          replies:
            metrics.reply_count ?? 0,
          quotes:
            metrics.quote_count ?? 0,
        },
        relevanceScore:
          relevance.score + engagement,
        matchedCount:
          relevance.matchedCount,
        url:
          `https://x.com/${user?.username ?? "i"}/status/${tweet.id}`,
      };
    })
    .filter((tweet) =>
      keywords.length === 0 ||
      tweet.matchedCount > 0
    )
    .sort(
      (a, b) => {
        if (
          b.matchedCount !==
          a.matchedCount
        ) {
          return (
            b.matchedCount -
            a.matchedCount
          );
        }

        return (
          b.relevanceScore -
          a.relevanceScore
        );
      }
    )
    .slice(0, 3)
    .map(
      ({
        relevanceScore,
        matchedCount,
        ...tweet
      }) => tweet
    );
}

export async function GET(request: Request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const newsId = Number(
      searchParams.get("newsId")
    );

    if (!newsId) {
      return NextResponse.json(
        {
          error:
            "newsIdが必要です",
        },
        { status: 400 }
      );
    }

    const news =
      await prisma.news.findUnique({
        where: {
          id: newsId,
        },
        select: {
          id: true,
          title: true,
          summary: true,
          category: true,
        },
      });

    if (!news) {
      return NextResponse.json(
        {
          error:
            "記事が見つかりません",
        },
        { status: 404 }
      );
    }

    // まずはコストゼロの簡易検索
    let query =
      createInitialQuery(news.title);

    let xData =
      await searchX(query);

    let results =
      formatResults(xData, query);

    let usedAi = false;

    // 0件の場合だけAIで検索語を作り直す
    if (results.length === 0) {
      const aiQuery =
        await createAiSearchQuery(
          news.title,
          news.summary,
          news.category
        );

      if (aiQuery) {
        query = aiQuery;

        xData =
          await searchX(query);

        results =
          formatResults(xData, query);

        usedAi = true;
      }
    }

    return NextResponse.json({
      news: {
        id: news.id,
        title: news.title,
        category: news.category,
      },
      query,
      usedAi,
      count:
        results.length,
      results,
    });
  } catch (error) {
    console.error(
      "関連X投稿検索エラー:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "関連X投稿の検索に失敗しました",
      },
      { status: 500 }
    );
  }
}
