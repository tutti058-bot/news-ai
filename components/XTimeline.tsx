import Link from "next/link";

const X_USER_ID = "2084661197438435328";
const X_USERNAME = "news_ai_tutti";

type XMedia = {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
};

type XPost = {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    like_count?: number;
    reply_count?: number;
    repost_count?: number;
    quote_count?: number;
  };
  attachments?: {
    media_keys?: string[];
  };
};

type XApiResponse = {
  data?: XPost[];
  includes?: {
    media?: XMedia[];
  };
};

async function getMyXPosts(): Promise<XApiResponse> {
  const token = process.env.X_Bearer_Token;

  if (!token) {
    return {
      data: [],
    };
  }

  const params = new URLSearchParams({
    max_results: "3",
    exclude: "retweets,replies",
    "tweet.fields": "created_at,public_metrics,attachments",
    expansions: "attachments.media_keys",
    "media.fields": "type,url,preview_image_url",
  });

  const response = await fetch(
    `https://api.x.com/2/users/${X_USER_ID}/tweets?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: {
        revalidate: 300,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      "X投稿取得エラー:",
      JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
    );

    return {
      data: [],
    };
  }

  return (await response.json()) as XApiResponse;
}

function formatDate(value?: string) {
  if (!value) return "";

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function XTimeline() {
  const data = await getMyXPosts();
  const posts = data.data ?? [];
  const media = data.includes?.media ?? [];

  const mediaMap = new Map(
    media.map((item) => [item.media_key, item])
  );

  return (
    <section className="mb-6 rounded-3xl bg-white p-4 shadow-sm sm:mb-8 sm:p-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-wider text-blue-600">
            𝕏 X POSTS
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
            AI NEWSジャパンのX
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            最新のX投稿を表示しています
          </p>
        </div>

        <Link
          href={`https://x.com/${X_USERNAME}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800"
        >
          Xで見る
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
          X投稿を取得できませんでした
        </div>
      ) : (
        <div className="max-h-[600px] space-y-4 overflow-y-auto pr-1 sm:max-h-[620px]">
          {posts.map((post) => {
            const postMedia =
              post.attachments?.media_keys
                ?.map((key) => mediaMap.get(key))
                .find(
                  (item) =>
                    item?.type === "photo" ||
                    item?.type === "video"
                );

            const imageUrl =
              postMedia?.type === "photo"
                ? postMedia.url
                : postMedia?.preview_image_url;

            return (
              <article
                key={post.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                      AI
                    </div>

                    <div>
                      <p className="text-sm font-black text-slate-900">
                        AI NEWS ジャパン
                      </p>

                      <p className="text-xs text-slate-400">
                        @{X_USERNAME}
                        {post.created_at
                          ? ` ・ ${formatDate(post.created_at)}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`https://x.com/${X_USERNAME}/status/${post.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-black text-blue-600"
                  >
                    Xで開く
                  </Link>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-5 text-slate-800">
                  {post.text}
                </p>

                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt=""
                    className="mt-3 max-h-[260px] w-full rounded-2xl object-cover"
                  />
                )}

                <div className="mt-3 flex gap-5 text-xs font-bold text-slate-400">
                  <span>
                    💬 {post.public_metrics?.reply_count ?? 0}
                  </span>

                  <span>
                    🔁 {post.public_metrics?.repost_count ?? 0}
                  </span>

                  <span>
                    ❤️ {post.public_metrics?.like_count ?? 0}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
