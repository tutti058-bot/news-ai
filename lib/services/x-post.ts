const X_TWEETS_URL =
  "https" + "://" + "api.x.com/2/tweets";

function getAccessToken() {
  const token = process.env.X_ACCESS_TOKEN;

  if (!token) {
    throw new Error("X_ACCESS_TOKENが設定されていません");
  }

  return token;
}

export async function postTweet(text: string) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error("X投稿文が空です");
  }

  const accessToken = getAccessToken();

  const response = await fetch(X_TWEETS_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: trimmedText,
    }),
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
