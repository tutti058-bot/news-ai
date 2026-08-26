import { NextResponse } from "next/server";
import OpenAI from "openai";
import { list } from "@vercel/blob";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type CachedTweet = {
  id: string;
  authorId: string;
  text: string;
  createdAt?: string;
};

async function loadCache(): Promise<CachedTweet[]> {
  const result = await list({
    prefix: "x-auto-reply/",
  });

  const blob = result.blobs.find(
    (item) => item.pathname === "x-auto-reply/tweets.json"
  );

  if (!blob) return [];

  const response = await fetch(blob.url);

  if (!response.ok) return [];

  return (await response.json()) as CachedTweet[];
}

export async function GET() {
  try {
    // X APIは一切呼ばない
    const tweets = await loadCache();

    if (tweets.length === 0) {
      return NextResponse.json({
        mode: "ONE_CLICK_REPLY_LOW_COST",
        xApiCalls: 0,
        openaiCalls: 0,
        cachedTweets: 0,
        candidate: null,
        message:
          "投稿キャッシュがありません。同期APIを1回実行してください。",
      });
    }

    // コードだけでランダム選択
    const selected =
      tweets[Math.floor(Math.random() * tweets.length)];

    // AIは選ばれた1件だけ
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
          content: `投稿：\n${selected.text}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 80,
    });

    const reply =
      ai.choices[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({
      mode: "ONE_CLICK_REPLY_LOW_COST",
      xApiCalls: 0,
      openaiCalls: 1,
      cachedTweets: tweets.length,
      candidate: {
        tweetId: selected.id,
        authorId: selected.authorId,
        text: selected.text,
        createdAt: selected.createdAt,
        reply,
        xReplyUrl:
          "https://x.com/intent/tweet?in_reply_to=" +
          encodeURIComponent(selected.id) +
          "&text=" +
          encodeURIComponent(reply),
      },
    });
  } catch (error) {
    console.error("X返信候補エラー:", error);

    return NextResponse.json(
      {
        error: "X返信候補の作成に失敗しました",
      },
      { status: 500 }
    );
  }
}
