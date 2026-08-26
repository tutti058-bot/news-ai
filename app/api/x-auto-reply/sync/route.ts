import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

const MY_USER_ID = "2084661197438435328";

export async function GET() {
  try {
    // ① フォロワー取得
    const followerResponse = await fetch(
      `https://api.x.com/2/users/${MY_USER_ID}/followers?max_results=1000`,
      {
        headers: {
          Authorization: `Bearer ${process.env.X_Bearer_Token}`,
        },
      }
    );

    const followerData = await followerResponse.json();

    if (!followerResponse.ok) {
      return NextResponse.json(
        {
          error: "フォロワー同期に失敗しました",
          detail: followerData,
        },
        { status: followerResponse.status }
      );
    }

    const followerIds = new Set<string>();

    for (const user of followerData.data ?? []) {
      followerIds.add(user.id);
    }

    // ② 投稿検索
    const query =
      '("の" OR "が" OR "は" OR "を" OR "に" OR "で") lang:ja -is:retweet -is:reply';

    const searchUrl =
      "https://api.x.com/2/tweets/search/recent?" +
      new URLSearchParams({
        query,
        max_results: "100",
        "tweet.fields": "author_id,created_at,text",
      }).toString();

    const searchResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${process.env.X_Bearer_Token}`,
      },
    });

    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      return NextResponse.json(
        {
          error: "投稿同期に失敗しました",
          detail: searchData,
        },
        { status: searchResponse.status }
      );
    }

    // ③ フォロワーの投稿だけ保存
    const tweets = (searchData.data ?? [])
      .filter((tweet: {
        id: string;
        author_id: string;
        text: string;
        created_at?: string;
      }) => followerIds.has(tweet.author_id))
      .map((tweet: {
        id: string;
        author_id: string;
        text: string;
        created_at?: string;
      }) => ({
        id: tweet.id,
        authorId: tweet.author_id,
        text: tweet.text,
        createdAt: tweet.created_at,
      }));

    // ④ Blobへ保存
    const blob = await put(
      "x-auto-reply/tweets.json",
      JSON.stringify(tweets),
      {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
        allowOverwrite: true,
      }
    );

    return NextResponse.json({
      mode: "X_REPLY_SYNC",
      followerCount: followerIds.size,
      searched: searchData.data?.length ?? 0,
      cachedTweets: tweets.length,
      cacheUrl: blob.url,
      message: "同期完了",
    });
  } catch (error) {
    console.error("X返信同期エラー:", error);

    return NextResponse.json(
      {
        error: "X返信同期に失敗しました",
      },
      { status: 500 }
    );
  }
}
