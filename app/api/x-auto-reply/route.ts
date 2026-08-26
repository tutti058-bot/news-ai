import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MY_USER_ID = "2084661197438435328";

export async function GET() {
  try {
    // =========================================
    // 1. フォロワー取得：最大1回
    // =========================================

    const followerIds = new Set<string>();

    const followerUrl =
      "https://api.x.com/2/users/" +
      MY_USER_ID +
      "/followers?" +
      new URLSearchParams({
        max_results: "1000",
      }).toString();

    const followerResponse = await fetch(followerUrl, {
      headers: {
        Authorization: `Bearer ${process.env.X_Bearer_Token}`,
      },
    });

    const followerData = await followerResponse.json();

    if (!followerResponse.ok) {
      return NextResponse.json(
        {
          error: "フォロワー取得に失敗しました",
          detail: followerData,
        },
        { status: followerResponse.status }
      );
    }

    for (const user of followerData.data ?? []) {
      followerIds.add(user.id);
    }

    // =========================================
    // 2. X検索：1回だけ
    // =========================================

    const query =
      'の lang:ja -is:retweet -is:reply';

    const searchUrl =
      "https://api.x.com/2/tweets/search/recent?" +
      new URLSearchParams({
        query,
        max_results: "100",
        "tweet.fields": "author_id,created_at,text,referenced_tweets",
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
          error: "X投稿検索に失敗しました",
          detail: searchData,
        },
        { status: searchResponse.status }
      );
    }

    const tweets = searchData.data ?? [];

    // =========================================
    // 3. フォロワーの投稿だけ抽出
    // =========================================

    const candidates = tweets.filter((tweet: {
      id: string;
      author_id: string;
      text: string;
      created_at?: string;
      referenced_tweets?: Array<{
        type: string;
        id: string;
      }>;
    }) => {
      if (!followerIds.has(tweet.author_id)) {
        return false;
      }

      const text = tweet.text?.trim() ?? "";

      if (!text) return false;

      // URLだけの投稿は除外
      const withoutUrls =
        text.replace(/https?:\/\/\S+/g, "").trim();

      if (!withoutUrls) return false;

      // 未達成・勧誘系などは除外
      const excludedPattern =
        /あと\s*\d+|残り\s*\d+|目指す|目指して|達成したい|達成できますように|達成してほしい|達成できるよう|突破したい|突破できますように|到達したい|なりますように|アフィリエイト|LINE誘導|営業/;

      if (excludedPattern.test(text)) {
        return false;
      }

      return true;
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        mode: "ONE_CLICK_REPLY_LOW_COST",
        followerCount: followerIds.size,
        searched: tweets.length,
        candidateCount: 0,
        candidate: null,
      });
    }

    // =========================================
    // 4. フォロワーからランダムに1人だけ選ぶ
    // =========================================

    const selected =
      candidates[Math.floor(Math.random() * candidates.length)];

    // =========================================
    // 5. OpenAI：最大1回だけ
    // =========================================

    const ai = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI NEWS ジャパンの「やんすAI」です。

Xのフォロワーの投稿に対して自然な返信を1つ作ってください。

条件：
- 投稿内容に直接反応する
- 自然な日本語
- 25〜45文字程度
- 宣伝しない
- フォローを要求しない
- 無理に質問しない
- 投稿本文をそのまま繰り返さない
- @ユーザー名を入れない
- 絵文字は最大1個
- 最後は自然に「でやんす」
- 返信文だけを返す
`,
        },
        {
          role: "user",
          content: `投稿：\n${selected.text}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 80,
    });

    const reply =
      ai.choices[0]?.message?.content?.trim() ?? "";

    if (!reply) {
      return NextResponse.json({
        mode: "ONE_CLICK_REPLY_LOW_COST",
        followerCount: followerIds.size,
        searched: tweets.length,
        candidateCount: candidates.length,
        candidate: null,
      });
    }

    return NextResponse.json({
      mode: "ONE_CLICK_REPLY_LOW_COST",
      followerCount: followerIds.size,
      searched: tweets.length,
      candidateCount: candidates.length,
      candidate: {
        tweetId: selected.id,
        authorId: selected.author_id,
        text: selected.text,
        createdAt: selected.created_at,
        reply,
        xReplyUrl:
          "https://x.com/intent/tweet?in_reply_to=" +
          encodeURIComponent(selected.id) +
          "&text=" +
          encodeURIComponent(reply),
      },
    });

  } catch (error) {
    console.error("X自動返信候補エラー:", error);

    return NextResponse.json(
      {
        error: "X自動返信候補の作成に失敗しました",
      },
      { status: 500 }
    );
  }
}
