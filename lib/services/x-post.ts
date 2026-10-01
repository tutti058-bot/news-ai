import OAuth from "oauth-1.0a";
import crypto from "crypto";

const X_TWEETS_URL =
  "https" + "://" + "api.x.com/2/tweets";

const X_MEDIA_BASE_URL =
  "https" + "://" + "api.x.com/2/media/upload";

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
    throw new Error(
      "X OAuth1環境変数が不足しています"
    );
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

function getOAuthHeader(
  url: string,
  method: string
) {
  const { oauth, token } = getOAuth();

  const auth = oauth.authorize(
    {
      url,
      method,
    },
    token
  );

  return oauth.toHeader(auth).Authorization;
}

async function uploadMedia(
  image: string | Buffer,
  mimeType = "image/png"
): Promise<string> {
  let buffer: Buffer;

  if (Buffer.isBuffer(image)) {
    buffer = image;
  } else if (image.startsWith("data:")) {
    const match = image.match(
      /^data:[^;]+;base64,(.+)$/
    );

    if (!match) {
      throw new Error(
        "画像data URLの形式が不正です"
      );
    }

    buffer = Buffer.from(
      match[1],
      "base64"
    );
  } else {
    const response = await fetch(image);

    if (!response.ok) {
      throw new Error(
        `画像取得に失敗しました: ${response.status}`
      );
    }

    buffer = Buffer.from(
      await response.arrayBuffer()
    );
  }

  if (!buffer.length) {
    throw new Error(
      "アップロードする画像が空です"
    );
  }

  /*
   * STEP 1: Initialize
   */
  const initializeUrl =
    `${X_MEDIA_BASE_URL}/initialize`;

  const initializeAuth =
    getOAuthHeader(
      initializeUrl,
      "POST"
    );

  const initializeResponse =
    await fetch(initializeUrl, {
      method: "POST",
      headers: {
        Authorization: initializeAuth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        total_bytes: buffer.length,
        media_type: mimeType,
        media_category: "tweet_image",
      }),
    });

  const initializeData =
    await initializeResponse
      .json()
      .catch(() => null);

  if (!initializeResponse.ok) {
    console.error(
      "XメディアINITエラー:",
      initializeData
    );

    throw new Error(
      `X画像アップロード開始に失敗しました: ${initializeResponse.status}`
    );
  }

  const mediaId =
    initializeData?.data?.id ??
    initializeData?.media_id_string ??
    initializeData?.media_id;

  if (!mediaId) {
    console.error(
      "XメディアINITレスポンス:",
      initializeData
    );

    throw new Error(
      "XメディアIDを取得できませんでした"
    );
  }

  /*
   * STEP 2: Append
   *
   * 画像は1チャンクで送信。
   */
  const appendUrl =
    `${X_MEDIA_BASE_URL}/${mediaId}/append`;

  const appendAuth =
    getOAuthHeader(
      appendUrl,
      "POST"
    );

  const form = new FormData();

  form.append(
    "segment_index",
    "0"
  );

  /*
   * APPENDは実画像データをmultipart/form-dataで送信する。
   * Bufferを独立したArrayBufferへコピーしてBlob化する。
   */
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);

  const imageBlob = new Blob(
    [bytes.buffer],
    {
      type: mimeType,
    }
  );

  form.append(
    "media",
    imageBlob,
    "x-image.png"
  );

  const appendResponse =
    await fetch(appendUrl, {
      method: "POST",
      headers: {
        Authorization: appendAuth,
      },
      body: form,
    });

  const appendText =
    await appendResponse
      .text()
      .catch(() => "");

  if (!appendResponse.ok) {
    console.error(
      "XメディアAPPENDエラー:",
      appendText
    );

    throw new Error(
      `X画像アップロードに失敗しました: ${appendResponse.status}`
    );
  }

  /*
   * STEP 3: Finalize
   */
  const finalizeUrl =
    `${X_MEDIA_BASE_URL}/${mediaId}/finalize`;

  const finalizeAuth =
    getOAuthHeader(
      finalizeUrl,
      "POST"
    );

  const finalizeResponse =
    await fetch(finalizeUrl, {
      method: "POST",
      headers: {
        Authorization: finalizeAuth,
      },
    });

  const finalizeData =
    await finalizeResponse
      .json()
      .catch(() => null);

  if (!finalizeResponse.ok) {
    console.error(
      "XメディアFINALIZEエラー:",
      finalizeData
    );

    throw new Error(
      `X画像アップロード完了処理に失敗しました: ${finalizeResponse.status}`
    );
  }

  return String(mediaId);
}

export async function postTweet(
  text: string,
  image?: string | Buffer,
  imageMimeType = "image/png"
) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error(
      "X投稿文が空です"
    );
  }

  const { oauth, token } = getOAuth();

  let body: {
    text: string;
    media?: {
      media_ids: string[];
    };
  } = {
    text: trimmedText,
  };

  if (image) {
    const mediaId =
      await uploadMedia(
        image,
        imageMimeType
      );

    body = {
      text: trimmedText,
      media: {
        media_ids: [mediaId],
      },
    };
  }

  const auth = oauth.authorize(
    {
      url: X_TWEETS_URL,
      method: "POST",
    },
    token
  );

  const response =
    await fetch(X_TWEETS_URL, {
      method: "POST",
      headers: {
        Authorization:
          oauth.toHeader(auth).Authorization,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(body),
    });

  const data =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    console.error(
      "X投稿エラー:",
      data
    );

    throw new Error(
      `X投稿に失敗しました: ${response.status}`
    );
  }

  const postId =
    data?.data?.id;

  if (!postId) {
    console.error(
      "X投稿レスポンス:",
      data
    );

    throw new Error(
      "X投稿IDを取得できませんでした"
    );
  }

  return {
    id: postId as string,
    text: trimmedText,
    url:
      "https" +
      "://" +
      "x.com/news_ai_tutti/status/" +
      postId,
  };
}
