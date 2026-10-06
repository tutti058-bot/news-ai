const X_TWEETS_URL =
  "https" + "://" + "api.x.com/2/tweets";

const X_MEDIA_UPLOAD_URL =
  "https" + "://" + "upload.twitter.com/1.1/media/upload.json";

function getAccessToken() {
  const token = process.env.X_ACCESS_TOKEN;

  if (!token) {
    throw new Error("X_ACCESS_TOKENが設定されていません");
  }

  return token;
}

function getOAuth1Credentials() {
  const consumerKey = process.env.X_CONSUMER_KEY;
  const consumerSecret = process.env.X_CONSUMER_SECRET;
  const accessToken = process.env.X_OAUTH1_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_OAUTH1_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    throw new Error("X OAuth 1.0a認証情報が設定されていません");
  }

  return {
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
  };
}

function percentEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    "%" + char.charCodeAt(0).toString(16).toUpperCase()
  );
}

function hmacSha1(key: string, data: string) {
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.createHmac("sha1", key).update(data).digest("base64");
}

function createOAuth1Header(
  method: string,
  url: string,
  credentials: ReturnType<typeof getOAuth1Credentials>
) {
  const crypto = require("crypto") as typeof import("crypto");

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: credentials.accessToken,
    oauth_version: "1.0",
  };

  const parameterString = Object.keys(oauthParams)
    .sort()
    .map(
      (key) =>
        percentEncode(key) + "=" + percentEncode(oauthParams[key])
    )
    .join("&");

  const signatureBaseString =
    method.toUpperCase() +
    "&" +
    percentEncode(url) +
    "&" +
    percentEncode(parameterString);

  const signingKey =
    percentEncode(credentials.consumerSecret) +
    "&" +
    percentEncode(credentials.accessTokenSecret);

  oauthParams.oauth_signature = hmacSha1(signingKey, signatureBaseString);

  return (
    "OAuth " +
    Object.keys(oauthParams)
      .sort()
      .map(
        (key) =>
          percentEncode(key) + '="' + percentEncode(oauthParams[key]) + '"'
      )
      .join(", ")
  );
}

async function uploadImage(imageUrl: string) {
  const credentials = getOAuth1Credentials();

  const imageResponse = await fetch(imageUrl);

  if (!imageResponse.ok) {
    throw new Error(
      "X画像の取得に失敗しました: " + imageResponse.status
    );
  }

  const contentType =
    imageResponse.headers.get("content-type") || "image/jpeg";

  const buffer = await imageResponse.arrayBuffer();
  const blob = new Blob([buffer], { type: contentType });

  const form = new FormData();
  form.append("media", blob, "news-image");
  form.append("media_category", "tweet_image");

  const response = await fetch(X_MEDIA_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: createOAuth1Header(
        "POST",
        X_MEDIA_UPLOAD_URL,
        credentials
      ),
    },
    body: form,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("X画像アップロードエラー:", data);

    const detail =
      data?.detail ||
      data?.title ||
      data?.errors?.[0]?.message ||
      "";

    throw new Error(
      "X画像アップロードに失敗しました: " +
        response.status +
        (detail ? " " + detail : "")
    );
  }

  const mediaId = data?.media_id_string || data?.media_id;

  if (!mediaId) {
    throw new Error("X画像のmedia_idを取得できませんでした");
  }

  return String(mediaId);
}

export async function postTweet(
  text: string,
  imageUrls?: string | string[] | null
) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error("X投稿文が空です");
  }

  const imageUrlList = Array.isArray(imageUrls)
    ? imageUrls.filter(Boolean)
    : imageUrls
      ? [imageUrls]
      : [];

  const mediaIds = await Promise.all(
    imageUrlList.slice(0, 4).map((url) => uploadImage(url))
  );

  const body: {
    text: string;
    media?: { media_ids: string[] };
  } = {
    text: trimmedText,
  };

  if (mediaIds.length > 0) {
    body.media = {
      media_ids: mediaIds,
    };
  }

  const response = await fetch(X_TWEETS_URL, {
    method: "POST",
    headers: {
      Authorization: createOAuth1Header("POST", X_TWEETS_URL, getOAuth1Credentials()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("X投稿エラー:", data);

    const detail =
      data?.detail ||
      data?.title ||
      data?.errors?.[0]?.message ||
      "";

    throw new Error(
      "X投稿に失敗しました: " +
        response.status +
        (detail ? " " + detail : "")
    );
  }

  const postId = data?.data?.id;

  if (!postId) {
    throw new Error("X投稿IDを取得できませんでした");
  }

  return {
    id: String(postId),
    text: trimmedText,
    url:
      "https" +
      "://" +
      "x.com/news_ai_tutti/status/" +
      postId,
  };
}
