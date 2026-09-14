import { NextResponse } from "next/server";

type XPost = {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
    impression_count?: number;
  };
};

type XUser = {
  id: string;
  name?: string;
  username?: string;
  public_metrics?: {
    followers_count?: number;
  };
};

type RankedPost = {
  id: string;
  text: string;
  createdAt: string | null;
  author: {
    id: string;
    name: string;
    username: string;
    followers: number;
  };
  metrics: {
    impressions: number;
    likes: number;
    reposts: number;
    replies: number;
    quotes: number;
  };
  buzzScore: number;
  url: string;
};

function calcBuzzScore(post: XPost) {
  const m = post.public_metrics ?? {};

  const likes = m.like_count ?? 0;
  const reposts = m.retweet_count ?? 0;
  const replies = m.reply_count ?? 0;
  const quotes = m.quote_count ?? 0;

  const createdAt = post.created_at
    ? new Date(post.created_at).getTime()
    : Date.now();

  const hoursAgo = Math.max(
    0.25,
    (Date.now() - createdAt) / 1000 / 60 / 60
  );

  const engagement =
    likes +
    reposts * 2.5 +
    replies * 1.5 +
    quotes * 2;

  const velocity =
    engagement / Math.pow(hoursAgo, 0.7);

  return Math.round(velocity);
}

function isNoise(text: string) {
  const noisePatterns = [
    /成人/,
    /エロ/,
    /アダルト/,
    /裏垢/,
    /FANZA/i,
    /セクシー/,
    /グラビア/,
    /AV女優/,
    /フォロ[ーォ].*(100|1000)/i,
    /いいねした人.*フォロー/i,
    /フォロー.*RT/i,
    /RT.*フォロー/i,
    /プレゼント企画/,
    /Amazon.*PR/i,
    /PR案件/,
    /案件募集中/,
    /DMください/,
    /DM下さい/,
    /無料配布/,
  ];

  return noisePatterns.some((pattern) =>
    pattern.test(text)
  );
}

const SEARCH_QUERIES = [
  '("AI" OR "テクノロジー" OR "新サービス" OR "発表" OR "発売" OR "開始" OR "決定" OR "話題") lang:ja -is:retweet -is:reply',
  '("スポーツ" OR "サッカー" OR "Jリーグ" OR "日本代表" OR "野球" OR "試合" OR "優勝" OR "事件" OR "事故" OR "ニュース") lang:ja -is:retweet -is:reply',
];

async function searchX(
  query: string,
  startTime: string,
  nextToken?: string
) {
  const params: Record<string, string> = {
    query,
    max_results: "10",
    start_time: startTime,
    "tweet.fields":
      "created_at,public_metrics,author_id",
    expansions: "author_id",
    "user.fields":
      "name,username,public_metrics",
  };

  if (nextToken) {
    params.next_token = nextToken;
  }

  const url =
    "https://api.x.com/2/tweets/search/recent?" +
    new URLSearchParams(params).toString();

  const response = await fetch(url, {
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

export async function GET() {
  try {
    if (!process.env.X_Bearer_Token) {
      return NextResponse.json(
        {
          error:
            "X_Bearer_Token が設定されていません",
        },
        { status: 500 }
      );
    }

    const startTime = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    const users = new Map<string, XUser>();
    const seen = new Set<string>();
    const results: RankedPost[] = [];

    const nextTokens = new Map<string, string | undefined>(
      SEARCH_QUERIES.map((query) => [query, undefined])
    );

    // 最大3ページまで
    for (let page = 0; page < 3; page++) {
      const activeQueries = SEARCH_QUERIES.filter(
        (query) =>
          page === 0 ||
          Boolean(nextTokens.get(query))
      );

      if (activeQueries.length === 0) {
        break;
      }

      const responses = await Promise.all(
        activeQueries.map((query) =>
          searchX(
            query,
            startTime,
            nextTokens.get(query)
          ).then((data) => ({ query, data }))
        )
      );

      let addedThisPage = 0;

      for (const { query, data } of responses) {
        for (const user of data.includes?.users ?? []) {
          users.set(user.id, user);
        }

        for (const post of data.data ?? []) {
          if (seen.has(post.id)) {
            continue;
          }

          seen.add(post.id);

          if (isNoise(post.text)) {
            continue;
          }

          const user =
            users.get(post.author_id ?? "");

          const ranked: RankedPost = {
            id: post.id,
            text: post.text,
            createdAt:
              post.created_at ?? null,
            author: {
              id:
                user?.id ??
                post.author_id ??
                "",
              name:
                user?.name ?? "",
              username:
                user?.username ?? "",
              followers:
                user?.public_metrics
                  ?.followers_count ?? 0,
            },
            metrics: {
              impressions:
                post.public_metrics
                  ?.impression_count ?? 0,
              likes:
                post.public_metrics
                  ?.like_count ?? 0,
              reposts:
                post.public_metrics
                  ?.retweet_count ?? 0,
              replies:
                post.public_metrics
                  ?.reply_count ?? 0,
              quotes:
                post.public_metrics
                  ?.quote_count ?? 0,
            },
            buzzScore:
              calcBuzzScore(post),
            url:
              user?.username
                ? `https://x.com/${user.username}/status/${post.id}`
                : `https://x.com/i/status/${post.id}`,
          };

          results.push(ranked);
          addedThisPage++;
        }

        nextTokens.set(
          query,
          data.meta?.next_token
        );
      }

      // ある程度バズ候補が集まったら終了
      const currentTop = [...results]
        .sort(
          (a, b) =>
            b.buzzScore - a.buzzScore
        )
        .slice(0, 10);

      const strongCandidates =
        currentTop.filter(
          (post) =>
            post.metrics.likes >= 100 ||
            post.metrics.reposts >= 20 ||
            post.metrics.replies >= 20
        ).length;

      if (
        page >= 1 &&
        strongCandidates >= 5
      ) {
        break;
      }

      if (addedThisPage === 0) {
        break;
      }
    }

    results.sort(
      (a, b) =>
        b.buzzScore - a.buzzScore
    );

    return NextResponse.json({
      success: true,
      period: "過去24時間",
      fetchedCount: results.length,
      pagesChecked: 3,
      results: results.slice(0, 10),
    });
  } catch (error) {
    console.error(
      "Xバズ取得エラー:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Xバズ投稿の取得に失敗しました",
      },
      { status: 500 }
    );
  }
}
