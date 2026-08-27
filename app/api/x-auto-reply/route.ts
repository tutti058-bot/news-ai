import { NextResponse } from "next/server";
import OpenAI from "openai";
import { list, put } from "@vercel/blob";

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

type ReplyHistoryItem = {
  followerId: string;
  followerUsername: string;
  tweetId: string;
  reply: string;
  createdAt: string;
};

const HISTORY_PATH =
  "x-auto-reply/reply-history.json";

async function loadFollowers(): Promise<Follower[]> {
  const result = await list({
    prefix: "x-auto-reply/",
  });

  const blob = result.blobs.find(
    (item) =>
      item.pathname ===
      "x-auto-reply/followers.json"
  );

  if (!blob) return [];

  const response = await fetch(blob.url);

  if (!response.ok) return [];

  return (await response.json()) as Follower[];
}

async function loadReplyHistory(): Promise<ReplyHistoryItem[]> {
  try {
    const result = await list({
      prefix: "x-auto-reply/",
    });

    const blob = result.blobs.find(
      (item) => item.pathname === HISTORY_PATH
    );

    if (!blob) return [];

    const response = await fetch(blob.url);

    if (!response.ok) return [];

    const data = await response.json();

    return Array.isArray(data)
      ? (data as ReplyHistoryItem[])
      : [];
  } catch (error) {
    console.error(
      "返信履歴取得エラー:",
      error
    );
    return [];
  }
}

async function saveReplyHistory(
  history: ReplyHistoryItem[]
) {
  try {
    await put(
      HISTORY_PATH,
      JSON.stringify(history.slice(-50)),
      {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
      }
    );
  } catch (error) {
    // 履歴保存に失敗しても返信自体は止めない
    console.error(
      "返信履歴保存エラー:",
      error
    );
  }
}

function normalizeReply(
  text: string
): string {
  return text
    .toLowerCase()
    .replace(/[\s、。。，．,.!?！？]/g, "")
    .trim();
}

function cleanReply(value: string): string {
  let text = value.trim();

  text = text
    .replace(/^```(?:text|json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // @ユーザー名を除去
  text = text
    .replace(/@[A-Za-z0-9_]+/g, "")
    .trim();

  // 句読点を除去
  // 「。」で終わる問題もここで防ぐ
  text = text.replace(/[、。。，．,.]/g, "");

  // 改行整理
  text = text
    .replace(/\n{2,}/g, "\n")
    .trim();

  // やんす系を一度整理
  const yansuMatches =
    text.match(/やんす/g) ?? [];

  if (yansuMatches.length > 1) {
    let used = false;

    text = text.replace(
      /やんす/g,
      () => {
        if (!used) {
          used = true;
          return "やんす";
        }

        return "";
      }
    );
  }

  return text.trim();
}

export async function GET() {
  try {
    const followers = await loadFollowers();

    if (followers.length === 0) {
      return NextResponse.json({
        mode: "ONE_CLICK_FOLLOWER_REPLY",
        xApiCalls: 0,
        openaiCalls: 0,
        message:
          "フォロワー情報がありません。",
      });
    }

    const history =
      await loadReplyHistory();

    // 直近10回使ったフォロワーを避ける
    const recentFollowerIds =
      new Set(
        history
          .slice(-10)
          .map(
            (item) => item.followerId
          )
      );

    const availableFollowers =
      followers.filter(
        (follower) =>
          !recentFollowerIds.has(
            follower.id
          )
      );

    const followerPool =
      availableFollowers.length > 0
        ? availableFollowers
        : followers;

    const selectedFollower =
      followerPool[
        Math.floor(
          Math.random() *
            followerPool.length
        )
      ];

    const tweetsUrl =
      `https://api.x.com/2/users/${selectedFollower.id}/tweets?` +
      new URLSearchParams({
        max_results: "5",
        exclude: "retweets,replies",
        "tweet.fields":
          "created_at,text",
      }).toString();

    const tweetsResponse = await fetch(
      tweetsUrl,
      {
        headers: {
          Authorization:
            `Bearer ${process.env.X_Bearer_Token}`,
        },
      }
    );

    const tweetsData =
      await tweetsResponse.json();

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
        .replace(
          /https?:\/\/\S+/g,
          ""
        )
        .trim();

      return withoutUrls.length >= 8;
    });

    if (tweets.length === 0) {
      return NextResponse.json({
        mode:
          "ONE_CLICK_FOLLOWER_REPLY",
        xApiCalls: 1,
        openaiCalls: 0,
        follower: selectedFollower,
        message:
          "自然に返信できる最近の投稿がありません もう一度押してください",
      });
    }

    const selectedTweet =
      tweets[0];

    const recentReplies =
      history
        .slice(-8)
        .map(
          (item) => item.reply
        )
        .filter(Boolean);

    const ai =
      await openai.chat.completions.create(
        {
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: `
あなたはAI NEWS ジャパンの「やんすAI」です

Xのフォロワーの投稿に対して
本当に自然に返信できる場合だけ返信文を作ってください

最重要
- 投稿本文を正確に読んで具体的に反応する
- 投稿内容と関係のない一般論は禁止
- 投稿を言い換えるだけの返信は禁止
- 無理に褒めない
- 無理に質問しない
- 宣伝しない
- フォローを要求しない
- @ユーザー名を入れない
- 25〜45文字程度
- 軽いユーモアや親しみを入れてよい
- クスッとする程度の自然なユーモアにする
- 大げさなボケは禁止
- 相手を笑っているように見える表現は禁止
- 返信内容に合えば絵文字を1個まで使ってよい
- 😂など相手を笑っているように見える絵文字は禁止
- 「やんす」は0回または1回
- 「でやんす」は必須ではない
- 「。」は禁止
- 「、」も基本使わない
- 文章を短く区切りすぎない
- 文末は自然な言い切りや「！」や絵文字などで終えてよい
- 無理に「！」を付けない
- 直近の返信と似た表現を避ける

返信しない方がいい投稿
- 意味が分かりにくい
- 文脈不足
- 独り言だけ
- URLだけ
- 宣伝だけ
- センシティブな話題
- 返信すると違和感がある内容

その場合は shouldReply=false にしてください

必ずJSONだけ返してください

{
  "shouldReply": true,
  "reply": "自然な返信文",
  "reason": "返信できる理由"
}
`,
            },
            {
              role: "user",
              content: `
フォロワー名：
${selectedFollower.name}

投稿本文：
${selectedTweet.text}

直近の返信例：
${recentReplies.join("\n")}
`,
            },
          ],
          temperature: 0.65,
          max_tokens: 120,
          response_format: {
            type: "json_schema",
            json_schema: {
              name:
                "follower_reply",
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
        }
      );

    const raw =
      ai.choices[0]?.message
        ?.content ?? "{}";

    let result: AiReplyResult;

    try {
      result = JSON.parse(raw);
    } catch {
      return NextResponse.json({
        mode:
          "ONE_CLICK_FOLLOWER_REPLY",
        xApiCalls: 1,
        openaiCalls: 1,
        follower: selectedFollower,
        tweet: selectedTweet,
        message:
          "返信候補を解析できませんでした もう一度お試しください",
      });
    }

    if (
      !result.shouldReply ||
      !result.reply?.trim()
    ) {
      return NextResponse.json({
        mode:
          "ONE_CLICK_FOLLOWER_REPLY",
        xApiCalls: 1,
        openaiCalls: 1,
        follower: selectedFollower,
        tweet: selectedTweet,
        message:
          "今回は自然な返信が難しい投稿でした 別のフォロワーをお試しください",
      });
    }

    const reply =
      cleanReply(result.reply);

    if (!reply) {
      return NextResponse.json({
        mode:
          "ONE_CLICK_FOLLOWER_REPLY",
        xApiCalls: 1,
        openaiCalls: 1,
        follower: selectedFollower,
        tweet: selectedTweet,
        message:
          "返信文を整えられませんでした もう一度お試しください",
      });
    }

    // 直近の返信と完全一致する場合は採用しない
    const normalized =
      normalizeReply(reply);

    const duplicate =
      history.some(
        (item) =>
          normalizeReply(
            item.reply
          ) === normalized
      );

    if (duplicate) {
      return NextResponse.json({
        mode:
          "ONE_CLICK_FOLLOWER_REPLY",
        xApiCalls: 1,
        openaiCalls: 1,
        follower: selectedFollower,
        tweet: selectedTweet,
        message:
          "直近と似た返信になったため今回は見送りました もう一度お試しください",
      });
    }

    // 生成した返信を履歴へ保存
    const nextHistory = [
      ...history,
      {
        followerId:
          selectedFollower.id,
        followerUsername:
          selectedFollower.username,
        tweetId:
          selectedTweet.id,
        reply,
        createdAt:
          new Date().toISOString(),
      },
    ];

    await saveReplyHistory(
      nextHistory
    );

    return NextResponse.json({
      mode:
        "ONE_CLICK_FOLLOWER_REPLY",
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
