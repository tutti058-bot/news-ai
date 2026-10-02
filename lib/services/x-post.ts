import OAuth from "oauth-1.0a";
import crypto from "crypto";

const X_TWEETS_URL = "https" + "://" + "api.x.com/2/tweets";

function getOAuth() {
  const consumerKey = process.env.X_CONSUMER_KEY;
  const consumerSecret = process.env.X_CONSUMER_SECRET;
  const accessToken = process.env.X_OAUTH1_ACCESS_TOKEN;
  const accessTokenSecret =
    process.env.X_OAUTH1_ACCESS_TOKEN_SECRET;

  if (
    !consumerKey ||
    !consumerSecret ||
    !accessToken ||
    !accessTokenSecret
  ) {
    throw new Error("X OAuth1環境変数が不足しています");
  }

  const oauth = new OAuth({
    consumer: {
      key: consumerKey,
      secret: consumerSecret,
    },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return crypto
        .createHmac("sha1", key)
        .update(baseString)
        .digest("base64");
    },
  });

  return {
    oauth,
    token: {
      key: accessToken,
      secret: accessTokenSecret,
    },
  };
}

export async function postTweet(text: string) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error("X投稿文が空です");
  }

  const { oauth, token } = getOAuth();

  const auth = oauth.authorize(
    {
      url: X_TWEETS_URL,
      method: "POST",
    },
    token
  );

  const response = await fetch(X_TWEETS_URL, {
    method: "POST",
    headers: {
      Authorization: oauth.toHeader(auth).Authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: trimmedText,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("X投稿エラー:", data);

    throw new Error(
      `X投稿に失敗しました: ${response.status}`
    );
  }

  const postId = data?.data?.id;

  if (!postId) {
    throw new Error("X投稿IDを取得できませんでした");
  }

  return {
    id: String(postId),
    text: trimmedText,
    url: `https://x.com/news_ai_tutti/status/${postId}`,
  };
}
