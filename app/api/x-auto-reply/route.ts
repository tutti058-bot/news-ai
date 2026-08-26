import { NextResponse } from "next/server";
import OpenAI from "openai";
import { list } from "@vercel/blob";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Follower = {
  id: string;
  username: string;
  name: string;
};

type Tweet = {
  id: string;
  text: string;
  created_at?: string;
};

async function loadFollowers(): Promise<Follower[]> {
  const result = await list({
    prefix: "x-auto-reply/",
  });

  const blob = result.blobs.find(
    (item) => item.pathname === "x-auto-reply/followers.json"
  );

  if (!blob) return [];

  const response = await fetch(blob.url);

  if (!response.ok) return [];

  return (await response.json()) as Follower[];
}

export async function GET() {
  try {
    // X APIはフォロワー一覧取得には使わない
    // 保存済み842人程度のキャッシュからランダム選択
    const followers = await loadFollowers();

    if (followers.length === 0) {
      return NextResponse.json({
        mode: "ONE_CLICK_FOLLOWER_REPLY",
        xApiCalls: 0,
        openaiCalls: 0,
        message: "フォロワー情報がありません。",
      });
    }

    const selectedFollower =
      followers[Math.floor(Math.random() * followers.length)];

    // 選んだ1人の投稿だけ取得
    const tweetsUrl =
      `https://api.x.com/2/users/${selectedFollower.id}/tweets?` +
      new URLSearchParams({
        max_results: "5",
        exclude: "retweets,replies",
        "tweet.fields": "created_at,text",
      }).toString();

    const tweetsResponse = await fetch(tweetsUrl, {
      headers: {
        Authorization: `Bearer ${process.env.X_Bearer_Token}`,
      },
    });

    const tweetsData = await tweetsResponse.json();

    if (!tweetsResponse.ok) {
      return NextResponse.json(
        {
          error: "フォロワーの投稿取得に失敗しました",
          detail: tweetsData,
        },
        { status: tweetsResponse.status }
      );
    }

    const tweets: Tweet[] = (tweetsData.data ?? []).filter(
      (tweet: Tweet) => {
        const text = tweet.text?.trim() ?? "";

        if (!text) return false;

        const withoutUrls = text
          .replace(/https?:\/\/\S+/g, "")
          .trim();

        return withoutUrls.length > 0;
      }
    );

    if (tweets.length === 0) {
      return NextResponse.json({
        mode: "ONE_CLICK_FOLLOWER_REPLY",
        xApiCalls: 1,
        openaiCalls: 0,
        follower: selectedFollower,
        message:
          "選ばれたフォロワーに返信候補になる最近の投稿がありません。もう一度押してください。",
      });
    }

    const selectedTweet = tweets[0];

    // OpenAIは1回だけ
    const ai = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI NEWS ジャパンの「やんすAI」です。

Xのフォロワーの投稿に自然な返信を1つ作ってください。

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
          content: `投稿：\n${selectedTweet.text}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 80,
    });

    const reply =
      ai.choices[0]?.message?.content?.trim() ?? "";

    if (!reply) {
      return NextResponse.json({
        mode: "ONE_CLICK_FOLLOWER_REPLY",
        xApiCalls: 1,
        openaiCalls: 1,
        message: "返信文を作成できませんでした。もう一度お試しください。",
      });
    }

    return NextResponse.json({
      mode: "ONE_CLICK_FOLLOWER_REPLY",
      xApiCalls: 1,
      openaiCalls: 1,
      follower: selectedFollower,
      tweet: selectedTweet,
      reply,
      xReplyUrl:
        "https://x.com/intent/tweet?in_reply_to=" +
        encodeURIComponent(selectedTweet.id) +
        "&text=" +
        encodeURIComponent(reply),
    });
  } catch (error) {
    console.error("フォロワー返信候補エラー:", error);

    return NextResponse.json(
      {
        error: "返信候補の作成に失敗しました",
      },
      { status: 500 }
    );
  }
}
