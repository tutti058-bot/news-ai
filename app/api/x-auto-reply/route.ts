import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MY_USER_ID = "2084661197438435328";

async function aiJudgeAndReply(text: string) {
  const ai = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
あなたはAI NEWS ジャパンの「やんすAI」です。

X投稿を見て、本人が何かを達成したことを報告しているか判定してください。

対象：
- フォロワー数達成
- 登録者数達成
- 売上達成
- スコア達成
- 資格・試験などの達成
- 個人的な目標達成
- その他、本人が明確に成果を達成した報告

対象外：
- 達成を目指す、達成したい
- 達成方法の説明
- 商品・サービスの宣伝
- アフィリエイト
- LINE誘導
- 集客・営業
- 他人の達成報告
- 「達成」という単語があるだけ

JSONだけ返してください。

{
  "isAchievement": true,
  "reply": "返信文"
}

isAchievementがfalseならreplyは空文字。

返信条件：
- 30文字程度
- 自然なお祝い
- 押し売り・宣伝なし
- フォロー要求なし
- 絵文字は1個まで
- 最後は自然に「でやんす」
- 投稿本文にある @ユーザー名は返信文に入れない
`,
      },
      {
        role: "user",
        content: `投稿：\n${text}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 80,
  });

  const content = ai.choices[0]?.message?.content?.trim() ?? "";

  try {
    return JSON.parse(content) as {
      isAchievement: boolean;
      reply: string;
    };
  } catch {
    return {
      isAchievement: false,
      reply: "",
    };
  }
}

export async function GET() {
  try {
    // =========================================
    // 1. フォロワーを取得
    // =========================================

    const followerIds = new Set<string>();
    let paginationToken = "";

    for (let page = 0; page < 10; page++) {
      const url =
        "https://api.x.com/2/users/" +
        MY_USER_ID +
        "/followers?" +
        new URLSearchParams({
          max_results: "1000",
          ...(paginationToken
            ? { pagination_token: paginationToken }
            : {}),
        }).toString();

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.X_ACCESS_TOKEN}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          {
            error: "フォロワー取得に失敗しました",
            detail: data,
          },
          { status: response.status }
        );
      }

      for (const user of data.data ?? []) {
        followerIds.add(user.id);
      }

      paginationToken = data.meta?.next_token ?? "";

      if (!paginationToken) break;
    }

    // =========================================
    // 2. 達成系投稿を最大5ページ検索
    //    ※AIはまだ使わない
    // =========================================

    const query =
      '"です" lang:ja -is:retweet -is:reply';

    const allTweets: Array<{
      id: string;
      author_id: string;
      text: string;
      created_at?: string;
      referenced_tweets?: Array<{
        type: string;
        id: string;
      }>;
    }> = [];

    let nextToken = "";

    for (let page = 0; page < 1; page++) {
      const searchUrl =
        "https://api.x.com/2/tweets/search/recent?" +
        new URLSearchParams({
          query,
          max_results: "100",
          "tweet.fields": "author_id,created_at,text,referenced_tweets",
          ...(nextToken ? { next_token: nextToken } : {}),
        }).toString();

      const response = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${process.env.X_ACCESS_TOKEN}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          {
            error: "達成報告の検索に失敗しました",
            detail: data,
            page,
          },
          { status: response.status }
        );
      }

      for (const tweet of data.data ?? []) {
        allTweets.push(tweet);
      }

      nextToken = data.meta?.next_token ?? "";

      if (!nextToken) {
        break;
      }
    }

    // =========================================
    // 3. フォロワーの投稿だけに絞る
    //    ※AIはまだ使わない
    // =========================================

    const followerTweets = allTweets.filter((tweet) => {
      // フォロワー本人の投稿だけ
      if (!followerIds.has(tweet.author_id)) {
        return false;
      }

      // 他人への返信は除外
      const isReply = Array.isArray(tweet.referenced_tweets)
        && tweet.referenced_tweets.some(
          (ref) => ref.type === "replied_to"
        );

      if (isReply) {
        return false;
      }

      // 「まだ達成していない」目標投稿を除外
      const text = tweet.text;

      const futurePattern =
        /あと\s*\d+|残り\s*\d+|目指す|目指して|達成したい|達成できますように|達成してほしい|達成できるよう|突破したい|突破できますように|到達したい|なりますように/;

      if (futurePattern.test(text)) {
        return false;
      }

      return true;
    });

    // =========================================
    // 4. 交流候補を作る
    //    AIに渡す前にコード側で絞り込む
    // =========================================

    const positivePattern =
      /達成|突破|到達|自己ベスト|過去最高|収益化|初収益|合格|資格取得|やりました|嬉しい|ご報告|おはよう|おはよ|今日も頑張|今日もよろしく|よろしくお願いします|お疲れ様|おやすみ|ついに/;

    const excludedPattern =
      /あと\\s*\\d+|残り\\s*\\d+|目指す|目指して|達成したい|達成できますように|達成してほしい|達成できるよう|突破したい|突破できますように|到達したい|なりますように/;

    const cleanTweets = followerTweets.filter((tweet) => {
      const text = tweet.text.trim();

      if (!text) return false;

      // URLだけの投稿は除外
      const withoutUrls = text.replace(/https?:\/\/\S+/g, "").trim();
      if (!withoutUrls) return false;

      // 未達目標は除外
      if (excludedPattern.test(text)) return false;

      return true;
    });

    // まず交流しやすい投稿を優先
    const priorityTweets = cleanTweets.filter((tweet) =>
      positivePattern.test(tweet.text)
    );

    // 候補が少なければ普通の投稿から補充
    const pool = [
      ...priorityTweets,
      ...cleanTweets.filter(
        (tweet) => !priorityTweets.some((x) => x.id === tweet.id)
      ),
    ];

    // 重複を除き、最大3件だけAIへ
    const selectedTweets = pool
      .filter(
        (tweet, index, arr) =>
          arr.findIndex((x) => x.id === tweet.id) === index
      )
      .slice(0, 3);

    // =========================================
    // 5. AIで返信文を作る
    //    AI利用は最大3件だけ
    // =========================================

    const aiCandidates = [];

    for (const tweet of selectedTweets) {
      const ai = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `
あなたはAI NEWS ジャパンの「やんすAI」です。

Xのフォロワーの投稿に対する自然な返信を1つ作ってください。

投稿内容に合わせてください。
- 達成・お祝い → 一緒に喜ぶ
- おはよう → 朝の挨拶＋今日も頑張ろう
- 日常 → 自然に反応
- 仕事 → 労い・応援
- 趣味 → 内容に軽く反応

禁止：
- 宣伝
- フォロー要求
- 自分語り
- 無理に質問する
- 投稿内容に関係ない返信
- 「素晴らしいですね」だけの generic な返信
- 投稿本文の丸コピー

条件：
- 25〜45文字程度
- 自然な日本語
- 絵文字は最大1個
- 最後は自然に「でやんす」
- 投稿本文の @ユーザー名は入れない

返信文だけを返してください。
`,
          },
          {
            role: "user",
            content: `投稿：\n${tweet.text}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 80,
      });

      const reply = ai.choices[0]?.message?.content?.trim() ?? "";

      if (!reply) continue;

      aiCandidates.push({
        tweetId: tweet.id,
        authorId: tweet.author_id,
        text: tweet.text,
        createdAt: tweet.created_at,
        reply,
        xReplyUrl:
          "https://x.com/intent/tweet?in_reply_to=" +
          encodeURIComponent(tweet.id) +
          "&text=" +
          encodeURIComponent(reply),
      });
    }

    return NextResponse.json({
      mode: "ONE_CLICK_REPLY",
      followerCount: followerIds.size,
      searched: allTweets.length,
      followerTweets: followerTweets.length,
      matched: aiCandidates.length,
      candidates: aiCandidates,
    });

  } catch (error) {
    console.error("X達成報告検索エラー:", error);

    return NextResponse.json(
      {
        error: "達成報告の検索に失敗しました",
      },
      { status: 500 }
    );
  }
}
