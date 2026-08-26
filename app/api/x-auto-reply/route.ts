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

type AiReplyResult = {
  shouldReply: boolean;
  reply: string;
  reason: string;
};

async function loadFollowers(): Promise<Follower[]> {
  const result = await list({
    prefix: "x-auto-reply/",
  });

  const blob = result.blobs.find(
    (item) =>
      item.pathname === "x-auto-reply/followers.json"
  );

  if (!blob) return [];

  const response = await fetch(blob.url);

  if (!response.ok) return [];

  return (await response.json()) as Follower[];
}

function cleanReply(value: string): string {
  let text = value.trim();

  // コードブロック除去
  text = text
    .replace(/^```(?:text|json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // @ユーザー名を除去
  text = text
    .replace(/@[A-Za-z0-9_]+/g, "")
    .trim();

  // 改行の連続を整理
  text = text
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // 「やんす」を最大1回にする
  const parts = text.split(/やんす/g);

  if (parts.length > 1) {
    text =
      parts[0].trim() +
      "でやんす" +
      parts
        .slice(1)
        .join("")
        .trim();
  }

  // 2回目以降の「でやんす」を除去
  text = text.replace(
    /でやんす.*でやんす/g,
    (match) =>
      match.slice(
        0,
        match.indexOf("でやんす") +
          "でやんす".length
      )
  );

  return text.trim();
}

export async function GET() {
  try {
    // 保存済みフォロワーからランダム選択
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
      followers[
        Math.floor(
          Math.random() * followers.length
        )
      ];

    // 選んだ1人の最近の投稿を取得
    const tweetsUrl =
      `https://api.x.com/2/users/${selectedFollower.id}/tweets?` +
      new URLSearchParams({
        max_results: "5",
        exclude: "retweets,replies",
        "tweet.fields": "created_at,text",
      }).toString();

    const tweetsResponse = await fetch(tweetsUrl, {
      headers: {
        Authorization:
          `Bearer ${process.env.X_Bearer_Token}`,
      },
    });

    const tweetsData = await tweetsResponse.json();

    if (!tweetsResponse.ok) {
      return NextResponse.json(
        {
          error:
            "フォロワーの投稿取得に失敗しました",
          detail: tweetsData,
        },
        { status: tweetsResponse.status }
      );
    }

    const tweets: Tweet[] = (
      tweetsData.data ?? []
    ).filter((tweet: Tweet) => {
      const text =
        tweet.text?.trim() ?? "";

      if (!text) return false;

      const withoutUrls = text
        .replace(/https?:\/\/\S+/g, "")
        .trim();

      return withoutUrls.length >= 8;
    });

    if (tweets.length === 0) {
      return NextResponse.json({
        mode: "ONE_CLICK_FOLLOWER_REPLY",
        xApiCalls: 1,
        openaiCalls: 0,
        follower: selectedFollower,
        message:
          "自然に返信できる最近の投稿がありません。もう一度押してください。",
      });
    }

    const selectedTweet = tweets[0];

    const ai =
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `
あなたはAI NEWS ジャパンの「やんすAI」です。

Xのフォロワーの投稿に対して、
「本当に自然に返信できる場合だけ」返信文を作ってください。

最重要：
- 投稿内容を正確に読んでから判断する
- 投稿内容に具体的に反応する
- 投稿と関係のない一般論は禁止
- 投稿内容をほぼ言い換えるだけの返信は禁止
- 無理に褒めない
- 無理に質問しない
- 宣伝しない
- フォローを要求しない
- @ユーザー名を入れない
- 絵文字は最大1個
- 25〜45文字程度
- 「やんす」は0回または1回だけ
- 「でやんす」を使う場合も1回だけ
- 不自然になる場合は「やんす」を使わなくてよい

返信が不自然になる投稿：
- 意味が分かりにくい
- 文脈不足
- 独り言や短すぎる投稿
- ただのURL共有
- 宣伝だけ
- センシティブな話題
- 返信すると違和感がある内容

その場合は shouldReply=false にしてください。

必ずJSONだけ返してください。

{
  "shouldReply": true,
  "reply": "自然な返信文",
  "reason": "返信できる理由"
}
`,
          },
          {
            role: "user",
            content:
              `フォロワー名：${selectedFollower.name}

投稿本文：
${selectedTweet.text}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 120,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "follower_reply",
            strict: true,
            schema: {
              type: "object",
              properties: {
                shouldReply: {
                  type: "boolean",
                },
                reply: {
                  type: "string",
                },
                reason: {
                  type: "string",
                },
              },
              required: [
                "shouldReply",
                "reply",
                "reason",
              ],
              additionalProperties: false,
            },
          },
        },
      });

    const raw =
      ai.choices[0]?.message?.content ??
      "{}";

    let result: AiReplyResult;

    try {
      result = JSON.parse(raw);
    } catch {
      return NextResponse.json({
        mode: "ONE_CLICK_FOLLOWER_REPLY",
        xApiCalls: 1,
        openaiCalls: 1,
        follower: selectedFollower,
        tweet: selectedTweet,
        message:
          "返信候補を解析できませんでした。もう一度お試しください。",
      });
    }

    if (
      !result.shouldReply ||
      !result.reply?.trim()
    ) {
      return NextResponse.json({
        mode: "ONE_CLICK_FOLLOWER_REPLY",
        xApiCalls: 1,
        openaiCalls: 1,
        follower: selectedFollower,
        tweet: selectedTweet,
        message:
          "今回の投稿には自然な返信が難しいため、別のフォロワーをお試しください。",
      });
    }

    const reply = cleanReply(result.reply);

    if (!reply) {
      return NextResponse.json({
        mode: "ONE_CLICK_FOLLOWER_REPLY",
        xApiCalls: 1,
        openaiCalls: 1,
        follower: selectedFollower,
        tweet: selectedTweet,
        message:
          "返信文を整えられませんでした。もう一度お試しください。",
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
        encodeURIComponent(
          selectedTweet.id
        ) +
        "&text=" +
        encodeURIComponent(reply),
    });
  } catch (error) {
    console.error(
      "フォロワー返信候補エラー:",
      error
    );

    return NextResponse.json(
      {
        error:
          "返信候補の作成に失敗しました",
      },
      { status: 500 }
    );
  }
}
