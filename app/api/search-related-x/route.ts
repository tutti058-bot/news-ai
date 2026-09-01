import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  public_metrics?: {
    followers_count?: number;
  };
};

const MAJOR_NEWS_ACCOUNTS = [
  "YahooNewsTopics",
  "nhk_news",
  "itmedia_news",
  "impress_watch",
  "Sankei_news",
  "asahi",
  "mainichi",
  "Yomiuri_Online",
  "jijicom",
  "kyodo_official",
  "gigazine",
  "asciijpeditors",
  "ktai_watch",
  "game_watch",
  "cnet_japan",
  "internet_watch",
];

function cleanTitle(title: string) {
  return title
    .replace(
      /\s*[-｜|]\s*(産経ニュース|NHK|NHKニュース|Yahoo!ニュース|スポーツ報知|スポニチ|日刊スポーツ|デイリースポーツ|ORICON NEWS|毎日新聞|朝日新聞|読売新聞).*$/i,
      ""
    )
    .replace(
      /[「」『』【】（）()[\]、。，．！？!?：:・]/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function createKeywords(title: string) {
  const text = cleanTitle(title);

  const stopWords = new Set([
    "新型",
    "新",
    "登場",
    "発表",
    "発売",
    "詳細",
    "詳細スペック",
    "スペック",
    "シリーズ",
    "機種",
    "モデル",
    "全モデル",
    "搭載",
    "可能性",
    "流出",
    "最新",
    "今回",
    "記事",
    "ニュース",
    "開始",
    "公開",
    "対応",
    "機能",
    "サービス",
    "について",
    "など",
  ]);

  const words = text
    .split(/\s+/)
    .filter(
      (word) =>
        word.length >= 2 &&
        !stopWords.has(word)
    );

  const result: string[] = [];

  // 連続する2語を優先
  for (
    let i = 0;
    i < words.length - 1;
    i++
  ) {
    const pair =
      `${words[i]} ${words[i + 1]}`;

    if (
      pair.length >= 4 &&
      !result.includes(pair)
    ) {
      result.push(pair);
    }
  }

  // 単独の固有名詞候補
  for (const word of words) {
    if (
      word.length >= 3 &&
      !result.includes(word)
    ) {
      result.push(word);
    }
  }

  return result.slice(0, 4);
}

function buildSearchQuery(
  keywords: string[]
) {
  const accounts =
    MAJOR_NEWS_ACCOUNTS
      .map(
        (username) =>
          `from:${username}`
      )
      .join(" OR ");

  const terms =
    keywords
      .map(
        (keyword) =>
          `"${keyword.replace(/"/g, "")}"`
      )
      .join(" OR ");

  return `(${accounts}) (${terms}) lang:ja -is:retweet`;
}

async function searchX(
  keyword: string
) {
  const query =
    buildSearchQuery([keyword]);

  const url =
    "https://api.x.com/2/tweets/search/recent?" +
    new URLSearchParams({
      query,
      max_results: "50",
      "tweet.fields":
        "created_at,public_metrics,author_id",
      expansions: "author_id",
      "user.fields":
        "name,username,public_metrics",
    }).toString();

  const response = await fetch(url, {
    headers: {
      Authorization:
        `Bearer ${process.env.X_Bearer_Token}`,
    },
    cache: "no-store",
  });

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail ??
        "X投稿の検索に失敗しました"
    );
  }

  return {
    query,
    data,
  };
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(
      /[「」『』【】（）()[\]、。，．！？!?：:・"'「」]/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function isSameNews(
  tweetText: string,
  articleTitle: string
) {
  const tweet =
    normalize(tweetText);

  const title =
    normalize(articleTitle);

  if (!tweet || !title) {
    return false;
  }

  // タイトル全文に近い場合だけ除外
  if (
    tweet.includes(title) ||
    title.includes(tweet)
  ) {
    return true;
  }

  const words =
    title
      .split(" ")
      .filter(
        (word) =>
          word.length >= 3
      );

  if (words.length < 4) {
    return false;
  }

  const matched =
    words.filter(
      (word) =>
        tweet.includes(word)
    ).length;

  return (
    matched >= 5 &&
    matched / words.length >= 0.7
  );
}

function formatResults(
  data: any,
  articleTitle: string,
  sourceUrl: string | null
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

  return tweets
    .filter(
      (tweet) =>
        tweet.text &&
        tweet.public_metrics &&
        tweet.author_id
    )
    .map((tweet) => {
      const user =
        userMap.get(tweet.author_id);

      const username =
        user?.username ?? "";

      const followers =
        user?.public_metrics
          ?.followers_count ?? 0;

      return {
        id: tweet.id,
        text: tweet.text,
        createdAt:
          tweet.created_at ?? null,
        author: {
          id: tweet.author_id,
          name:
            user?.name ?? "不明",
          username,
          followers,
        },
        metrics: {
          impressions:
            tweet.public_metrics
              ?.impression_count ?? 0,
          likes:
            tweet.public_metrics
              ?.like_count ?? 0,
          reposts:
            tweet.public_metrics
              ?.retweet_count ?? 0,
          replies:
            tweet.public_metrics
              ?.reply_count ?? 0,
          quotes:
            tweet.public_metrics
              ?.quote_count ?? 0,
        },
        sameSource:
          Boolean(
            sourceUrl &&
            tweet.text.includes(sourceUrl)
          ),
        sameNews:
          isSameNews(
            tweet.text,
            articleTitle
          ),
        isMajorNews:
          MAJOR_NEWS_ACCOUNTS.some(
            (name) =>
              name.toLowerCase() ===
              username.toLowerCase()
          ),
        url:
          `https://x.com/${username}/status/${tweet.id}`,
      };
    })
    .filter(
      (tweet) =>
        !tweet.sameSource &&
        !tweet.sameNews
    )
    .sort((a, b) => {
      // 大手ニュース媒体を優先
      if (
        a.isMajorNews !==
        b.isMajorNews
      ) {
        return a.isMajorNews
          ? -1
          : 1;
      }

      // フォロワー数
      if (
        b.author.followers !==
        a.author.followers
      ) {
        return (
          b.author.followers -
          a.author.followers
        );
      }

      // 反応
      const aEngagement =
        a.metrics.likes +
        a.metrics.reposts * 2 +
        a.metrics.replies +
        a.metrics.quotes * 2;

      const bEngagement =
        b.metrics.likes +
        b.metrics.reposts * 2 +
        b.metrics.replies +
        b.metrics.quotes * 2;

      return (
        bEngagement -
        aEngagement
      );
    });
}

export async function GET(
  request: Request
) {
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
          category: true,
          sourceUrl: true,
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

    const keywords =
      createKeywords(news.title);

    if (keywords.length === 0) {
      return NextResponse.json({
        news: {
          id: news.id,
          title: news.title,
          category: news.category,
        },
        query: "",
        keywords: [],
        count: 0,
        results: [],
      });
    }

    // 上位2キーワードでXを2回検索
    const searchKeywords =
      keywords.slice(0, 2);

     const resultMap = new Map<string, any>();
    const queries: string[] = [];

    for (const keyword of searchKeywords) {
      const search =
        await searchX(keyword);

      queries.push(search.query);

      const formatted =
        formatResults(
          search.data,
          news.title,
          news.sourceUrl ?? null
        );

      for (const item of formatted) {
        if (!resultMap.has(item.id)) {
          resultMap.set(
            item.id,
            item
          );
        }
      }
    }

    const formattedResults =
      Array.from(
        resultMap.values()
      );

    // 大手ニュース媒体を優先
    formattedResults.sort(
      (a, b) => {
        if (
          a.isMajorNews !==
          b.isMajorNews
        ) {
          return a.isMajorNews
            ? -1
            : 1;
        }

        if (
          b.author.followers !==
          a.author.followers
        ) {
          return (
            b.author.followers -
            a.author.followers
          );
        }

        const aEngagement =
          a.metrics.likes +
          a.metrics.reposts * 2 +
          a.metrics.replies +
          a.metrics.quotes * 2;

        const bEngagement =
          b.metrics.likes +
          b.metrics.reposts * 2 +
          b.metrics.replies +
          b.metrics.quotes * 2;

        return (
          bEngagement -
          aEngagement
        );
      }
    );

    // 同じアカウントは1件だけ、最大3件
    const selected: typeof formattedResults = [];
    const usedAccounts =
      new Set<string>();

    for (const item of formattedResults) {
      const username =
        item.author.username.toLowerCase();

      if (
        !username ||
        usedAccounts.has(username)
      ) {
        continue;
      }

      usedAccounts.add(username);
      selected.push(item);

      if (selected.length >= 3) {
        break;
      }
    }

    return NextResponse.json({
      news: {
        id: news.id,
        title: news.title,
        category: news.category,
      },
      query:
        queries.join(" / "),
      keywords: searchKeywords,
      count:
        selected.length,
      majorNewsAccounts:
        MAJOR_NEWS_ACCOUNTS,
      results: selected,
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
