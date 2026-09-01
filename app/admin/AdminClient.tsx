"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SummaryData = {
  summary: string;
};

type AffiliateProgram = {
  id: number;
  name: string;
  programId: string | null;
  url: string;
  category: string | null;
  keywords: string | null;
  description: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
};

export default function AdminClient() {
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState("");

  // ニュース一覧・X投稿・関連記事
  type NewsItem = {
    id: number;
    title: string;
    summary: string | null;
    category: string | null;
    source: string | null;
    sourceUrl: string;
    image: string | null;
    score: number | null;
    publishedAt: string | null;
  };

  type RelatedNewsItem = {
    id: number;
    title: string;
    sourceUrl: string;
    category: string | null;
    publishedAt: string | null;
    score: number;
  };

  type RelatedXPost = {
  id: string;
  text: string;
  createdAt: string | null;
  author: {
    id: string;
    name: string;
    username: string;
  };
  metrics: {
    impressions: number;
    likes: number;
    reposts: number;
    replies: number;
    quotes: number;
  };
  url: string;
};

  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [newsListLoading, setNewsListLoading] = useState(false);
  const [xPostLoadingId, setXPostLoadingId] = useState<number | null>(null);
  const [xPostConfirmLoadingId, setXPostConfirmLoadingId] = useState<number | null>(null);
  const [relatedLoadingId, setRelatedLoadingId] = useState<number | null>(null);
  const [relatedNews, setRelatedNews] = useState<Record<number, RelatedNewsItem[]>>({});
  const [copiedRelatedId, setCopiedRelatedId] = useState<number | null>(null);
  const [relatedReplyLoadingId, setRelatedReplyLoadingId] = useState<number | null>(null);
  const [relatedXLoadingId, setRelatedXLoadingId] =
  useState<number | null>(null);

const [relatedXPosts, setRelatedXPosts] =
  useState<Record<number, RelatedXPost[]>>({});

const [relatedXReplyLoadingId, setRelatedXReplyLoadingId] =
  useState<string | null>(null);

type RelatedXReply = {
  reply1: string;
  reply2: string;
  replyWithUrl1: string;
  replyWithUrl2: string;
};

const [relatedXReplies, setRelatedXReplies] =
  useState<Record<string, RelatedXReply>>({});

const [copiedRelatedXReplyId, setCopiedRelatedXReplyId] =
  useState<string | null>(null);

  type ContentRequestItem = {
    id: number;
    name: string | null;
    message: string;
    status: string;
    createdAt: string;
  };

  const [contentRequests, setContentRequests] =
    useState<ContentRequestItem[]>([]);
  const [contentRequestsLoading, setContentRequestsLoading] =
    useState(false);

  const loadContentRequests = async () => {
    setContentRequestsLoading(true);

    try {
      const res = await fetch(
        "/api/admin/content-request?_=" + Date.now(),
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ??
            "リクエスト一覧の取得に失敗しました"
        );
      }

      setContentRequests(data.requests ?? []);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? `リクエスト取得失敗：${error.message}`
          : "リクエスト一覧の取得に失敗しました"
      );
    } finally {
      setContentRequestsLoading(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    loadContentRequests();
  }, []);

  // =========================
  // リクエストBOX
  // =========================

  const createRelatedXReply = async (
    newsId: number,
    relatedNewsId: number
  ) => {
    setRelatedReplyLoadingId(relatedNewsId);
    setMessage("");

    try {
      const res = await fetch(
        "/api/related-x-reply",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newsId,
            relatedNewsId,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.replyText) {
        throw new Error(
          data.error ??
            "Xコメントの作成に失敗しました"
        );
      }

      try {
        await navigator.clipboard.writeText(
          data.replyText
        );
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = data.replyText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setMessage(
        "💬 コメントをコピーしました。Xで自分の投稿への返信欄に貼り付けてください。"
      );
    } catch (error) {
      console.error(
        "関連記事Xコメント作成エラー:",
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(
        `Xコメント作成失敗：${errorMessage}`
      );
    } finally {
      setRelatedReplyLoadingId(null);
    }
  };

  // =========================
  // 選択した記事のX投稿作成
  // =========================


  // =========================
  // 関連記事を取得
  // =========================

  const loadRelatedNews = async (newsId: number) => {
    setRelatedLoadingId(newsId);
    setMessage("");

    try {
      const res = await fetch(
        `/api/related-x-comment?newsId=${newsId}`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ?? "関連記事の取得に失敗しました"
        );
      }

      setRelatedNews((prev) => ({
        ...prev,
        [newsId]: data.related ?? [],
      }));

      if (!data.related || data.related.length === 0) {
        setMessage("関連記事が見つかりませんでした");
      }
    } catch (error) {
      console.error("関連記事取得エラー:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(
        `関連記事取得失敗：${errorMessage}`
      );
    } finally {
      setRelatedLoadingId(null);
    }
  };

  // =========================
  // 選択した記事のX投稿作成
  // =========================

  const createXPostForNews = async (newsId: number) => {
    setXPostLoadingId(newsId);
    setMessage("");

    // ボタンを押した瞬間に空タブを開く
    // AI生成後のwindow.openはブラウザにブロックされるため、
    // 先にタブだけ確保しておく。
    const xWindow = window.open(
      "about:blank",
      "_blank"
    );

    try {
      const res = await fetch("/api/post-x", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newsId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.intentUrl) {
        if (xWindow && !xWindow.closed) {
          xWindow.close();
        }

        throw new Error(
          data.error ?? "X投稿の作成に失敗しました"
        );
      }

      setMessage(
        `X投稿を作成しました！ AI評価：${data.score}点`
      );

      // 先に開いておいたタブをX投稿画面へ移動
      if (xWindow && !xWindow.closed) {
        xWindow.location.href = data.intentUrl;
      } else {
        // ポップアップがブロックされた場合の予備処理
        window.location.href = data.intentUrl;
      }
    } catch (error) {
      console.error("X投稿作成エラー:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(
        `X投稿作成失敗：${errorMessage}`
      );
    } finally {
      setXPostLoadingId(null);
    }
  };

  // =========================
  // 関連記事を取得
  // =========================

  // =========================
  // 関連X投稿を検索
  // =========================
  
  const findRelatedXPosts = async (
    newsId: number
  ) => {
    setRelatedXLoadingId(newsId);
    setMessage("");
  
    try {
      const res = await fetch(
        `/api/search-related-x?newsId=${newsId}`
      );
  
      const data = await res.json();
  
      if (!res.ok) {
        throw new Error(
          data.error ??
            "関連X投稿の検索に失敗しました"
        );
      }
  
      setRelatedXPosts((prev) => ({
        ...prev,
        [newsId]: data.results ?? [],
      }));
  
      if ((data.results ?? []).length === 0) {
        setMessage(
          "関連するX投稿が見つかりませんでした"
        );
      } else {
        setMessage(
          `関連X投稿を${data.results.length}件見つけました`
        );
      }
    } catch (error) {
      console.error(
        "関連X投稿検索エラー:",
        error
      );
  
      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーです";
  
      setMessage(
        `関連X投稿検索失敗：${errorMessage}`
      );
    } finally {
      setRelatedXLoadingId(null);
    }
  };

  // =========================
  // 関連X投稿へのコメント案を生成
  // =========================

  const generateRelatedXReply = async (
    newsId: number,
    post: RelatedXPost
  ) => {
    setRelatedXReplyLoadingId(post.id);
    setMessage("");

    try {
      const res = await fetch(
        "/api/generate-x-reply",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newsId,
            tweetText: post.text,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ??
            "コメント案の生成に失敗しました"
        );
      }

      if (
        !data.reply1 ||
        !data.reply2 ||
        !data.replyWithUrl1 ||
        !data.replyWithUrl2
      ) {
        throw new Error(
          "コメント案が生成されませんでした"
        );
      }

      setRelatedXReplies((prev) => ({
        ...prev,
        [post.id]: {
          reply1: data.reply1,
          reply2: data.reply2,
          replyWithUrl1: data.replyWithUrl1,
          replyWithUrl2: data.replyWithUrl2,
        },
      }));

      setMessage(
        "Xコメント案を2件生成しました"
      );
    } catch (error) {
      console.error(
        "関連Xコメント生成エラー:",
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーです";

      setMessage(
        `Xコメント生成失敗：${errorMessage}`
      );
    } finally {
      setRelatedXReplyLoadingId(null);
    }
  };

  const findRelatedNews = async (newsId: number) => {
    setRelatedLoadingId(newsId);
    setMessage("");

    try {
      const res = await fetch(
        `/api/related-x-comment?newsId=${newsId}`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ?? "関連記事の取得に失敗しました"
        );
      }

      setRelatedNews((prev) => ({
        ...prev,
        [newsId]: data.related ?? [],
      }));

      if ((data.related ?? []).length === 0) {
        setMessage("関連記事が見つかりませんでした");
      } else {
        setMessage(
          `関連記事を${data.related.length}件見つけました`
        );
      }
    } catch (error) {
      console.error("関連記事取得エラー:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーです";

      setMessage(
        `関連記事取得失敗：${errorMessage}`
      );
    } finally {
      setRelatedLoadingId(null);
    }
  };

  const [followerReplyLoading, setFollowerReplyLoading] =
    useState(false);

  const [followerSyncLoading, setFollowerSyncLoading] =
    useState(false);

  const [followerReply, setFollowerReply] = useState<{
    follower?: {
      id: string;
      username: string;
      name: string;
    };
    tweet?: {
      id: string;
      text: string;
      created_at?: string;
    };
    reply?: string;
    xReplyUrl?: string;
    message?: string;
  } | null>(null);

  // サイト全体の閲覧数
  const [totalViews, setTotalViews] = useState(0);
  const [todayViews, setTodayViews] = useState(0);
  const [yesterdayViews, setYesterdayViews] = useState(0);
  const [last7DaysViews, setLast7DaysViews] = useState(0);
  const [thisMonthViews, setThisMonthViews] = useState(0);
  const [viewsLoading, setViewsLoading] = useState(true);

  // アフィリエイト案件
  const [affiliateName, setAffiliateName] = useState("");
  const [affiliateProgramId, setAffiliateProgramId] =
    useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [affiliateCategory, setAffiliateCategory] = useState<string[]>([]);
    useState("");
  const [affiliateKeywords, setAffiliateKeywords] =
    useState("");
  const [affiliatePriority, setAffiliatePriority] =
    useState(0);

  const [affiliateLoading, setAffiliateLoading] =
    useState(false);

  // 登録済み案件
  const [affiliatePrograms, setAffiliatePrograms] =
    useState<AffiliateProgram[]>([]);

  const [affiliateListLoading, setAffiliateListLoading] =
    useState(false);

  const [affiliateDeleteLoading, setAffiliateDeleteLoading] =
    useState<number | null>(null);

  // 編集
  const [editingAffiliateId, setEditingAffiliateId] =
    useState<number | null>(null);

  const [affiliateEditLoading, setAffiliateEditLoading] =
    useState(false);

      // =========================
  // コラム管理
  // =========================

  type Column = {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    image: string | null;
    publishedAt: string | null;
    isPublished: boolean;
    createdAt: string;
  };

  const [columns, setColumns] = useState<Column[]>([]);
  const [columnTitle, setColumnTitle] = useState("");
  const [columnSlug, setColumnSlug] = useState("");
  const [columnExcerpt, setColumnExcerpt] = useState("");
  const [columnContent, setColumnContent] = useState("");
  const [columnImage, setColumnImage] = useState("");
  const [columnIsPublished, setColumnIsPublished] =
    useState(true);
  const [columnLoading, setColumnLoading] = useState(false);
  const [columnListLoading, setColumnListLoading] =
    useState(false);
  const [columnDeleteLoading, setColumnDeleteLoading] =
    useState<number | null>(null);

  // コラム編集
  const [editingColumnId, setEditingColumnId] =
    useState<number | null>(null);

  const [columnEditLoading, setColumnEditLoading] =
    useState(false);

  // コラム本文への漫画画像挿入
  const [columnImageUploading, setColumnImageUploading] =
    useState(false);

      // =========================
  // ニュース一覧取得
  // =========================

  const loadNews = async () => {
    setNewsListLoading(true);

    try {
      const res = await fetch("/api/db-news?_=" + Date.now());
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ?? "ニュースの取得に失敗しました"
        );
      }

      setNewsList(data ?? []);
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(`ニュース取得失敗：${errorMessage}`);
    } finally {
      setNewsListLoading(false);
    }
  };

  const loadColumns = async () => {
    setColumnListLoading(true);

    try {
      const res = await fetch("/api/column");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ?? "コラムの取得に失敗しました"
        );
      }

      setColumns(data.columns ?? []);
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(`コラム取得失敗：${errorMessage}`);
    } finally {
      setColumnListLoading(false);
    }
  };

  const registerColumn = async () => {
    if (!columnTitle.trim()) {
      setMessage("コラムタイトルを入力してください");
      return;
    }

    if (!columnSlug.trim()) {
      setMessage("slugを入力してください");
      return;
    }

    if (!columnContent.trim()) {
      setMessage("本文を入力してください");
      return;
    }

    setColumnLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/column", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: columnTitle,
          slug: columnSlug,
          excerpt: columnExcerpt,
          content: columnContent,
          image: columnImage,
          isPublished: columnIsPublished,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ?? "コラムの登録に失敗しました"
        );
      }

      setMessage("コラムを登録しました");

      setColumnTitle("");
      setColumnSlug("");
      setColumnExcerpt("");
      setColumnContent("");
      setColumnImage("");
      setColumnIsPublished(true);

      await loadColumns();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(`コラム登録失敗：${errorMessage}`);
    } finally {
      setColumnLoading(false);
    }
  };

  const startEditColumn = (column: Column) => {
    setEditingColumnId(column.id);

    setColumnTitle(column.title);
    setColumnSlug(column.slug);
    setColumnExcerpt(column.excerpt ?? "");
    setColumnContent(column.content);
    setColumnImage(column.image ?? "");
    setColumnIsPublished(column.isPublished);

    setMessage(`「${column.title}」を編集しています`);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const updateColumn = async () => {
    if (editingColumnId === null) {
      return;
    }

    if (!columnTitle.trim()) {
      setMessage("コラムタイトルを入力してください");
      return;
    }

    if (!columnSlug.trim()) {
      setMessage("slugを入力してください");
      return;
    }

    if (!columnContent.trim()) {
      setMessage("本文を入力してください");
      return;
    }

    setColumnEditLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/column", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingColumnId,
          title: columnTitle,
          slug: columnSlug,
          excerpt: columnExcerpt,
          content: columnContent,
          image: columnImage,
          isPublished: columnIsPublished,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ?? "コラムの更新に失敗しました"
        );
      }

      setMessage(`「${data.column.title}」を更新しました`);

      setEditingColumnId(null);
      setColumnTitle("");
      setColumnSlug("");
      setColumnExcerpt("");
      setColumnContent("");
      setColumnImage("");
      setColumnIsPublished(true);

      await loadColumns();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(`コラム更新失敗：${errorMessage}`);
    } finally {
      setColumnEditLoading(false);
    }
  };

  const cancelEditColumn = () => {
    setEditingColumnId(null);

    setColumnTitle("");
    setColumnSlug("");
    setColumnExcerpt("");
    setColumnContent("");
    setColumnImage("");
    setColumnIsPublished(true);

    setMessage("コラム編集をキャンセルしました");
  };

  const deleteColumn = async (
    id: number,
    title: string
  ) => {
    if (
      !window.confirm(
        `「${title}」を削除しますか？`
      )
    ) {
      return;
    }

    setColumnDeleteLoading(id);
    setMessage("");

    try {
      const res = await fetch("/api/column", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ?? "コラムの削除に失敗しました"
        );
      }

      setMessage("コラムを削除しました");

      await loadColumns();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(`コラム削除失敗：${errorMessage}`);
    } finally {
      setColumnDeleteLoading(null);
    }
  };
  
  // =========================
  // ニュース一覧
  // =========================

  const loadNewsList = async () => {
    setNewsListLoading(true);

    try {
      const res = await fetch(
        "/api/db-news?_=" + Date.now(),
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ?? "ニュース一覧の取得に失敗しました"
        );
      }

      setNewsList(data ?? []);
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(
        `ニュース一覧取得失敗：${errorMessage}`
      );
    } finally {
      setNewsListLoading(false);
    }
  };

  // =========================
  // ニュース取得
  // =========================

  const syncNews = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/news/sync");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ?? "ニュース取得に失敗しました"
        );
      }

      setMessage(
        `取得完了：新規 ${data.added}件 / スキップ ${data.skipped}件 / 合計 ${data.total}件`
      );

      // 最新記事一覧も更新
      await loadNewsList();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(`取得失敗：${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // 今日のニュースまとめ
  // =========================

  const createSummary = async () => {
    setSummaryLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/daily-summary");
      const data: SummaryData = await res.json();

      if (!res.ok) {
        throw new Error(
          "ニュースまとめの作成に失敗しました"
        );
      }

      setSummary(data.summary);
      setMessage("今日のニュースまとめを作成しました");
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(`まとめ作成失敗：${errorMessage}`);
    } finally {
      setSummaryLoading(false);
    }
  };

  // =========================
  // 登録済み案件取得
  // =========================

  const loadAffiliatePrograms = async () => {
    setAffiliateListLoading(true);

    try {
      const res = await fetch("/api/affiliate");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ??
            "案件一覧の取得に失敗しました"
        );
      }

      setAffiliatePrograms(data.programs ?? []);
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "案件一覧の取得に失敗しました";

      setMessage(
        `案件一覧取得失敗：${errorMessage}`
      );
    } finally {
      setAffiliateListLoading(false);
    }
  };

    useEffect(() => {
    loadAffiliatePrograms();
    loadColumns();

    const loadTotalViews = async () => {
      try {
        const res = await fetch("/api/admin/view-stats");

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(
            data.error ?? "閲覧数の取得に失敗しました"
          );
        }

      setTotalViews(data.totalViews ?? 0);
      setTodayViews(data.todayViews ?? 0);
      setYesterdayViews(data.yesterdayViews ?? 0);
      setLast7DaysViews(data.last7DaysViews ?? 0);
      setThisMonthViews(data.thisMonthViews ?? 0);
      } catch (error) {
        console.error("閲覧数取得エラー:", error);
      } finally {
        setViewsLoading(false);
      }
    };

    loadTotalViews();
  }, []);

  // =========================
  // 入力欄リセット
  // =========================

  const resetAffiliateForm = () => {
    setAffiliateName("");
    setAffiliateProgramId("");
    setAffiliateUrl("");
    setAffiliateCategory([]);
    setAffiliateKeywords("");
    setAffiliatePriority(0);
    setEditingAffiliateId(null);
  };

  // =========================
  // アフィリエイト案件登録
  // =========================

  const registerAffiliate = async () => {
    if (!affiliateName || !affiliateUrl) {
      setMessage(
        "案件名と広告リンクを入力してください"
      );
      return;
    }

    setAffiliateLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/affiliate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: affiliateName,
          programId: affiliateProgramId,
          url: affiliateUrl,
          category: affiliateCategory.join(","),
          keywords: affiliateKeywords,
          priority: affiliatePriority,
          isActive: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ??
            "案件の登録に失敗しました"
        );
      }

      setMessage(
        `「${data.program.name}」を登録しました`
      );

      resetAffiliateForm();

      await loadAffiliatePrograms();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(
        `案件登録失敗：${errorMessage}`
      );
    } finally {
      setAffiliateLoading(false);
    }
  };

  // =========================
  // アフィリエイト案件編集開始
  // =========================

  const startEditAffiliate = (
    program: AffiliateProgram
  ) => {
    setEditingAffiliateId(program.id);

    setAffiliateName(program.name);
    setAffiliateProgramId(
      program.programId ?? ""
    );
    setAffiliateUrl(program.url);
    setAffiliateCategory(
      program.category ? program.category.split(",").map((item) => item.trim()).filter(Boolean) : []
    );
    setAffiliateKeywords(
      program.keywords ?? ""
    );
    setAffiliatePriority(program.priority);

    setMessage(
      `「${program.name}」を編集しています`
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================
  // アフィリエイト案件更新
  // =========================

  const updateAffiliate = async () => {
    if (
      editingAffiliateId === null ||
      !affiliateName ||
      !affiliateUrl
    ) {
      setMessage(
        "案件名と広告リンクを入力してください"
      );
      return;
    }

    setAffiliateEditLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/affiliate", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingAffiliateId,
          name: affiliateName,
          programId: affiliateProgramId,
          url: affiliateUrl,
          category: affiliateCategory.join(","),
          keywords: affiliateKeywords,
          priority: affiliatePriority,
          isActive: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ??
            "案件の更新に失敗しました"
        );
      }

      setMessage(
        `「${data.program.name}」を更新しました`
      );

      resetAffiliateForm();

      await loadAffiliatePrograms();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(
        `案件更新失敗：${errorMessage}`
      );
    } finally {
      setAffiliateEditLoading(false);
    }
  };

  // =========================
  // 編集キャンセル
  // =========================

  const cancelEditAffiliate = () => {
    resetAffiliateForm();
    setMessage("編集をキャンセルしました");
  };

  // =========================
  // アフィリエイト案件削除
  // =========================

  const deleteAffiliate = async (
    id: number,
    name: string
  ) => {
    const confirmed = window.confirm(
      `「${name}」を削除しますか？`
    );

    if (!confirmed) {
      return;
    }

    setAffiliateDeleteLoading(id);
    setMessage("");

    try {
      const res = await fetch(
        `/api/affiliate?id=${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ??
            "案件の削除に失敗しました"
        );
      }

      setMessage(
        `「${name}」を削除しました`
      );

      await loadAffiliatePrograms();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(
        `案件削除失敗：${errorMessage}`
      );
    } finally {
      setAffiliateDeleteLoading(null);
    }
  };

  // =========================
  // X投稿
  // =========================

  const postToX = async () => {
    if (!summary) {
      setMessage(
        "先に今日のニュースまとめを作成してください"
      );
      return;
    }

    try {
      setMessage(
        "やんすAIがX投稿を作成中..."
      );

      const res = await fetch(
        "/api/post-daily-x?_=" + Date.now(),
        {
          method: "POST",
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ??
            "X投稿の作成に失敗しました"
        );
      }

      console.log("===== X POST DEBUG =====");
      console.log("tweet:", data.tweet);
      console.log("hook:", data.hook);
      console.log("description:", data.description);
      console.log("intentUrl:", data.intentUrl);

      // APIから返ってきた最新のtweet本文から
      // X投稿URLを管理画面側で直接生成する
      const freshIntentUrl =
        "https://twitter.com/intent/tweet?text=" +
        encodeURIComponent(data.tweet);

      console.log("===== X投稿デバッグ =====");
      console.log("API tweet:", data.tweet);
      console.log("Fresh intentUrl:", freshIntentUrl);

      window.open(
        freshIntentUrl,
        "_blank"
      );

      setMessage(
        `X投稿を作成しました！ AI評価：${data.score}点`
      );
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました";

      setMessage(
        `X投稿作成失敗：${errorMessage}`
      );
    }
  };

  const syncFollowers = async () => {
    setFollowerSyncLoading(true);
    setMessage("フォロワー情報を更新しています...");

    try {
      const res = await fetch("/api/x-auto-reply/sync");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ?? "フォロワー更新に失敗しました"
        );
      }

      setMessage(
        `フォロワー情報を更新しました：${data.followerCount ?? 0}人`
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "フォロワー更新に失敗しました"
      );
    } finally {
      setFollowerSyncLoading(false);
    }
  };

  const createFollowerReply = async () => {
    setFollowerReplyLoading(true);
    setFollowerReply(null);
    setMessage("");

    try {
      const res = await fetch("/api/x-auto-reply");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ?? "返信候補の作成に失敗しました"
        );
      }

      setFollowerReply(data);

      if (data.message) {
        setMessage(data.message);
      }
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "返信候補の作成に失敗しました"
      );
    } finally {
      setFollowerReplyLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-4 sm:py-10">
      <div className="mx-auto max-w-6xl">

        {/* ヘッダー */}
        <div className="mb-6 sm:mb-10">
          <p className="font-bold text-blue-600">
            AI NEWS ジャパン
          </p>

          <h1 className="mt-1 text-3xl font-black text-slate-900 sm:mt-2 sm:text-4xl">
            管理画面
          </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500 sm:mt-3 sm:text-base">
            ニュース取得・まとめ作成・X投稿・アフィリエイト案件を管理します。
          </p>
        </div>

        {/* サイト全体の閲覧数 */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mb-8 sm:rounded-3xl sm:p-7 sm:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-slate-400">
                SITE VIEWS
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-900">
                👁 サイト全体の閲覧数
              </h2>
            </div>

            <div className="text-right">
              {viewsLoading ? (
                <p className="text-sm font-bold text-slate-400">
                  読み込み中...
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400">
                      全体
                    </p>
                    <p className="text-2xl font-black text-blue-600">
                      {totalViews.toLocaleString()}
                      <span className="ml-1 text-sm text-slate-500">
                        PV
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400">
                      今日
                    </p>
                    <p className="text-2xl font-black text-emerald-600">
                      {todayViews.toLocaleString()}
                      <span className="ml-1 text-sm text-slate-500">
                        PV
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400">
                      昨日
                    </p>
                    <p className="text-2xl font-black text-slate-700">
                      {yesterdayViews.toLocaleString()}
                      <span className="ml-1 text-sm text-slate-500">
                        PV
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400">
                      過去7日
                    </p>
                    <p className="text-2xl font-black text-violet-600">
                      {last7DaysViews.toLocaleString()}
                      <span className="ml-1 text-sm text-slate-500">
                        PV
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400">
                      今月
                    </p>
                    <p className="text-2xl font-black text-orange-500">
                      {thisMonthViews.toLocaleString()}
                      <span className="ml-1 text-sm text-slate-500">
                        PV
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* フォロワー交流 */}
        <div className="mb-6 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
          <div className="mb-4">
            <h2 className="text-xl font-black text-slate-900">
              フォロワー交流
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              フォロワーからランダムに1人選び、最近の投稿への返信案を作成します。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={createFollowerReply}
              disabled={followerReplyLoading || followerSyncLoading}
              className="rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {followerReplyLoading
                ? "返信候補を作成中..."
                : "フォロワーに返信する"}
            </button>

            <button
              type="button"
              onClick={syncFollowers}
              disabled={followerReplyLoading || followerSyncLoading}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {followerSyncLoading
                ? "更新中..."
                : "フォロワー情報を更新"}
            </button>
          </div>

          {followerReply?.message && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
              {followerReply.message}
            </div>
          )}

          {followerReply?.tweet && (
            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold text-slate-400">
                {followerReply.follower?.name ||
                  followerReply.follower?.username ||
                  "フォロワー"}
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                {followerReply.tweet.text}
              </p>

              <div className="mt-5 border-t border-slate-200 pt-5">
                <p className="text-xs font-bold text-blue-600">
                  やんすAIの返信案
                </p>

                <p className="mt-2 text-sm font-bold leading-6 text-slate-900">
                  {followerReply.reply}
                </p>

                {followerReply.xReplyUrl && (
                  <a
                    href={followerReply.xReplyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block rounded-2xl bg-black px-5 py-3 font-bold text-white"
                  >
                    𝕏 Xで返信する
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ニュース・まとめ */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">

          {/* ニュース取得 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-7 sm:shadow-lg">
            <div className="text-4xl">
              🔄
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              最新ニュースを取得
            </h2>

            <p className="mt-3 leading-7 text-slate-500">
              RSSから最新ニュースを取得し、新規ニュースだけをAI分析して保存します。
            </p>

            <button
              onClick={syncNews}
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-blue-600 px-6 py-4 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "取得中..."
                : "ニュースを取得する"}
            </button>
          </section>

          {/* 今日のニュースまとめ */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-7 sm:shadow-lg">
            <div className="text-4xl">
              📰
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              今日のニュースまとめ
            </h2>

            <p className="mt-3 leading-7 text-slate-500">
              今日のニュースをAIがまとめます。
            </p>

            <button
              onClick={createSummary}
              disabled={summaryLoading}
              className="mt-6 w-full rounded-2xl bg-slate-900 px-6 py-4 font-black text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {summaryLoading
                ? "まとめを作成中..."
                : "📰 今日のニュースまとめを作成"}
            </button>
          </section>

        </div>

        {/* 最新ニュース一覧 */}
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-6 sm:rounded-3xl sm:p-7 sm:shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-4xl">
                🗞️
              </div>

              <h2 className="mt-2 text-xl font-black text-slate-900 sm:mt-4 sm:text-2xl">
                最新ニュース
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Xに投稿したい記事をここから選択できます。
              </p>
            </div>

            <button
              type="button"
              onClick={loadNewsList}
              disabled={newsListLoading}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {newsListLoading
                ? "更新中..."
                : "一覧を更新"}
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {newsList.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
                {newsListLoading
                  ? "ニュースを読み込んでいます..."
                  : "ニュースがありません"}
              </div>
            ) : (
              newsList.map((news) => (
                <article
                  key={news.id}
                  className="rounded-2xl border border-slate-200 p-3 transition hover:border-slate-300 sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                    <span>
                      {news.source || "RSS"}
                    </span>

                    {news.category && (
                      <>
                        <span>・</span>
                        <span>{news.category}</span>
                      </>
                    )}

                    {news.publishedAt && (
                      <>
                        <span>・</span>
                        <span>
                          {new Date(
                            news.publishedAt
                          ).toLocaleString("ja-JP")}
                        </span>
                      </>
                    )}

                    <span className="ml-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                      AI評価：{news.score}点
                    </span>
                  </div>

                  <div className="mt-3 flex gap-4">
                    <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <img
                        src={news.image ?? "/news.jpg"}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-black leading-7 text-slate-900">
                        {news.title}
                      </h3>

                      {news.summary && (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                          {news.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                    <Link
                      href={`/news/${news.id}`}
                      target="_blank"
                      className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:min-h-0"
                    >
                      記事を見る
                    </Link>

                    <button
                      onClick={() =>
                        createXPostForNews(news.id)
                      }
                      disabled={
                        xPostLoadingId === news.id
                      }
                      className="min-h-11 rounded-xl bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
                    >
                      {xPostLoadingId === news.id
                        ? "X投稿を作成中..."
                        : "𝕏 X投稿を作成"}
                    </button>

                    <button
                      onClick={() =>
                        loadRelatedNews(news.id)
                      }
                      disabled={
                        relatedLoadingId === news.id
                      }
                      className="min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
                    >
                      {relatedLoadingId === news.id
                        ? "関連記事を検索中..."
                        : "🔗 関連記事を探す"}
                    </button>

                    <button
                      onClick={() =>
                        findRelatedXPosts(news.id)
                      }
                      disabled={
                        relatedXLoadingId === news.id
                      }
                      className="min-h-11 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
                    >
                      {relatedXLoadingId === news.id
                        ? "X投稿を検索中..."
                        : "𝕏 関連投稿を探す"}
                    </button>
                  </div>

                  {/* 関連X投稿 */}
                  {relatedXPosts[news.id] &&
                    relatedXPosts[news.id].length > 0 && (
                      <div className="mt-5 rounded-2xl bg-slate-900 p-4">
                        <h4 className="text-sm font-black text-white">
                          𝕏 関連投稿
                        </h4>

                        <div className="mt-3 space-y-3">
                          {relatedXPosts[news.id].map(
                            (post) => (
                              <div
                                key={post.id}
                                className="rounded-xl bg-white p-4"
                              >
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-black text-slate-900">
                                    {post.author.name}
                                  </span>

                                  {post.author.username && (
                                    <span className="text-slate-400">
                                      @{post.author.username}
                                    </span>
                                  )}

                                  <span className="ml-auto text-slate-400">
                                    ❤️ {post.metrics.likes}
                                  </span>

                                  <span className="text-slate-400">
                                    🔁 {post.metrics.reposts}
                                  </span>
                                </div>

                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                  {post.text}
                                </p>

                                {relatedXReplies[post.id] && (
                                  <div className="mt-4 space-y-3 rounded-xl bg-slate-100 p-3">
                                    <div className="text-xs font-black text-slate-900">
                                      💬 やんすAIのコメント案
                                    </div>

                                    {[
                                      {
                                        label: "コメント案①",
                                        text: relatedXReplies[post.id].replyWithUrl1,
                                        copyId: `${post.id}-url1`,
                                      },
                                      {
                                        label: "コメント案②",
                                        text: relatedXReplies[post.id].replyWithUrl2,
                                        copyId: `${post.id}-url2`,
                                      },
                                    ].map((item) => (
                                      <div
                                        key={item.copyId}
                                        className="rounded-lg border border-slate-200 bg-white p-3"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <span className="text-xs font-black text-slate-700">
                                            {item.label}
                                          </span>

                                          <button
                                            type="button"
                                            onClick={async () => {
                                              try {
                                                await navigator.clipboard.writeText(
                                                  item.text
                                                );

                                                setCopiedRelatedXReplyId(
                                                  item.copyId
                                                );

                                                setTimeout(() => {
                                                  setCopiedRelatedXReplyId(
                                                    null
                                                  );
                                                }, 2000);
                                              } catch (error) {
                                                console.error(
                                                  "コピーエラー:",
                                                  error
                                                );
                                              }
                                            }}
                                            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                                          >
                                            {copiedRelatedXReplyId ===
                                            item.copyId
                                              ? "コピーしました"
                                              : "コピー"}
                                          </button>
                                        </div>

                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                          {item.text}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="mt-4 flex flex-wrap justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      generateRelatedXReply(
                                        news.id,
                                        post
                                      )
                                    }
                                    disabled={
                                      relatedXReplyLoadingId ===
                                      post.id
                                    }
                                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {relatedXReplyLoadingId ===
                                    post.id
                                      ? "コメント案を作成中..."
                                      : "💬 コメント案を作る"}
                                  </button>

                                  <a
                                    href={post.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg bg-black px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                                  >
                                    𝕏 投稿を見る
                                  </a>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* 関連記事 */}
                  {relatedNews[news.id] &&
                    relatedNews[news.id].length > 0 && (
                      <div className="mt-5 rounded-2xl bg-blue-50 p-4">
                        <h4 className="text-sm font-black text-slate-900">
                          🔗 関連記事
                        </h4>

                        <div className="mt-3 space-y-3">
                          {relatedNews[news.id].map(
                            (related) => (
                              <div
                                key={related.id}
                                className="rounded-xl border border-blue-100 bg-white p-4"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-black text-white">
                                    AI評価：{related.score}点
                                  </span>

                                  {related.category && (
                                    <span className="text-xs font-bold text-slate-400">
                                      {related.category}
                                    </span>
                                  )}
                                </div>

                                <p className="mt-2 text-sm font-black leading-6 text-slate-900">
                                  {related.title}
                                </p>

                                <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                                  <a
                                    href={`/news/${related.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:min-h-0"
                                  >
                                    記事を見る
                                  </a>

                                  <a
                                    href={related.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:min-h-0"
                                  >
                                    元記事
                                  </a>

                                  <button
                                    onClick={() =>
                                      createRelatedXReply(
                                        news.id,
                                        related.id
                                      )
                                    }
                                    disabled={
                                      relatedReplyLoadingId ===
                                      related.id
                                    }
                                    className="min-h-10 rounded-lg bg-black px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
                                  >
                                    {relatedReplyLoadingId ===
                                    related.id
                                      ? "コメント作成中..."
                                      : "💬 コメントをコピー"}
                                  </button>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </article>
              ))
            )}
          </div>
        </section>

        {/* メッセージ */}
        {message && (
          <div className="mt-6 rounded-2xl bg-white p-5 text-center font-bold text-slate-700 shadow">
            {message}
          </div>
        )}

        {/* ニュースまとめ */}
        {summary && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">

            <h2 className="text-2xl font-black text-slate-900">
              📰 今日のニュースまとめ
            </h2>

            <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 leading-8 text-slate-800">
              {summary}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">

              <button
                onClick={postToX}
                className="rounded-2xl bg-black px-6 py-4 font-black text-white transition hover:scale-[1.02]"
              >
                𝕏 Xに投稿する
              </button>

              <Link
                href="/daily-summary"
                className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center font-black text-slate-900 transition hover:bg-slate-50"
              >
                詳細ページを見る →
              </Link>

            </div>

          </section>
        )}

        {/* アフィリエイト案件管理 */}
        <details className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-lg group">
          <summary className="flex cursor-pointer list-none items-center justify-between p-7 font-black text-slate-900 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-4">
              <span className="text-3xl">💰</span>
              <div>
                <h2 className="text-2xl font-black">
                  アフィリエイト案件管理
                </h2>
                <p className="mt-1 text-sm font-normal text-slate-500">
                  広告案件・A8バナーを管理
                </p>
              </div>
            </div>

            <span className="text-2xl text-slate-400 transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>

          <div className="border-t border-slate-100 p-7">

          <div className="text-4xl">
            💰
          </div>

          <h2 className="mt-5 text-2xl font-black text-slate-900">
            アフィリエイト案件管理
          </h2>

          <Link
            href="/admin/affiliate-image"
            className="mt-5 inline-flex items-center rounded-2xl bg-slate-900 px-5 py-3 font-black text-white transition hover:bg-blue-600"
          >
            🖼️ A8バナー管理
          </Link>

          <p className="mt-2 leading-7 text-slate-500">
            A8.netなどの広告案件を登録します。
            登録した案件は、ニュース内容に合わせて自動表示します。
          </p>

          {/* 編集中表示 */}
          {editingAffiliateId !== null && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-black text-amber-800">
                ✏️ 案件を編集中です
              </p>

              <p className="mt-1 text-sm text-amber-700">
                下の入力欄を変更して「案件を更新する」を押してください。
              </p>
            </div>
          )}

          {/* 登録フォーム */}
          <div className="mt-6 space-y-5">

            {/* 案件名 */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                案件名 *
              </label>

              <input
                type="text"
                value={affiliateName}
                onChange={(e) =>
                  setAffiliateName(
                    e.target.value
                  )
                }
                placeholder="例：Notta"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* A8案件ID */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                A8案件ID
              </label>

              <input
                type="text"
                value={affiliateProgramId}
                onChange={(e) =>
                  setAffiliateProgramId(
                    e.target.value
                  )
                }
                placeholder="例：s00000024524001"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* 広告リンク */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                A8広告リンク *
              </label>

              <input
                type="url"
                value={affiliateUrl}
                onChange={(e) =>
                  setAffiliateUrl(
                    e.target.value
                  )
                }
                placeholder="A8で発行した広告リンクを貼り付け"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* カテゴリー */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                ニュースカテゴリー
              </label>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  "国内",
                  "国際",
                  "経済",
                  "テクノロジー",
                  "スポーツ",
                  "芸能",
                  "エンタメ",
                  "その他",
                ].map((category) => {
                  const checked = affiliateCategory.includes(category);

                  return (
                    <label
                      key={category}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                        checked
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setAffiliateCategory((current) =>
                            current.includes(category)
                              ? current.filter((item) => item !== category)
                              : [...current, category]
                          );
                        }}
                        className="h-4 w-4"
                      />
                      {category}
                    </label>
                  );
                })}
              </div>

              <p className="mt-2 text-xs text-slate-400">
                関連するカテゴリーを複数選択できます。
              </p>
            </div>

            {/* キーワード */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                関連キーワード
              </label>

              <input
                type="text"
                value={affiliateKeywords}
                onChange={(e) =>
                  setAffiliateKeywords(
                    e.target.value
                  )
                }
                placeholder="例：AI,ChatGPT,議事録,文字起こし"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                カンマ「,」で区切って入力してください。
              </p>
            </div>

            {/* 優先度 */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                優先度
              </label>

              <input
                type="number"
                min="0"
                max="100"
                value={affiliatePriority}
                onChange={(e) =>
                  setAffiliatePriority(
                    Number(e.target.value)
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                数字が大きいほど優先して使用します。
              </p>
            </div>

            {/* ボタン */}
            <div className="grid gap-3 sm:grid-cols-2">

              <button
                onClick={
                  editingAffiliateId !== null
                    ? updateAffiliate
                    : registerAffiliate
                }
                disabled={
                  affiliateLoading ||
                  affiliateEditLoading
                }
                className="w-full rounded-2xl bg-emerald-600 px-6 py-4 font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editingAffiliateId !== null
                  ? affiliateEditLoading
                    ? "更新中..."
                    : "✏️ 案件を更新する"
                  : affiliateLoading
                    ? "登録中..."
                    : "💰 アフィリエイト案件を登録する"}
              </button>

              {editingAffiliateId !== null && (
                <button
                  onClick={cancelEditAffiliate}
                  disabled={
                    affiliateEditLoading
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-6 py-4 font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  キャンセル
                </button>
              )}

            </div>

          </div>

          {/* 登録済み案件 */}
          <div className="mt-10 border-t border-slate-200 pt-8">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h3 className="text-2xl font-black text-slate-900">
                  📋 登録済み案件
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  現在登録されているアフィリエイト案件です。
                </p>
              </div>

              <button
                onClick={
                  loadAffiliatePrograms
                }
                disabled={
                  affiliateListLoading
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {affiliateListLoading
                  ? "更新中..."
                  : "🔄 一覧を更新"}
              </button>

            </div>

            {/* 案件なし */}
            {!affiliateListLoading &&
              affiliatePrograms.length ===
                0 && (
                <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                  登録されている案件はありません。
                </div>
              )}

            {/* 案件一覧 */}
            <div className="mt-5 space-y-4">

              {affiliatePrograms.map(
                (program) => (
                  <div
                    key={program.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <h4 className="text-lg font-black text-slate-900">
                            {program.name}
                          </h4>

                          {program.category && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                              {program.category}
                            </span>
                          )}

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              program.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {program.isActive
                              ? "有効"
                              : "無効"}
                          </span>

                        </div>

                        {program.programId && (
                          <p className="mt-2 text-sm text-slate-500">
                            A8案件ID：
                            <span className="font-mono">
                              {program.programId}
                            </span>
                          </p>
                        )}

                        {program.keywords && (
                          <p className="mt-2 text-sm text-slate-600">
                            キーワード：
                            {program.keywords}
                          </p>
                        )}

                        <p className="mt-2 text-sm font-bold text-slate-600">
                          優先度：
                          {program.priority}
                        </p>

                      </div>

                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">

                        <button
                          onClick={() =>
                            startEditAffiliate(
                              program
                            )
                          }
                          className="rounded-xl bg-amber-50 px-5 py-3 text-center text-sm font-black text-amber-700 hover:bg-amber-100"
                        >
                          ✏️ 編集
                        </button>

                        <a
                          href={program.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-black text-white hover:bg-blue-700"
                        >
                          🔗 広告を見る
                        </a>

                        <button
                          onClick={() =>
                            deleteAffiliate(
                              program.id,
                              program.name
                            )
                          }
                          disabled={
                            affiliateDeleteLoading ===
                            program.id
                          }
                          className="rounded-xl bg-red-50 px-5 py-3 text-sm font-black text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          {affiliateDeleteLoading ===
                          program.id
                            ? "削除中..."
                            : "🗑️ 削除"}
                        </button>

                      </div>

                    </div>

                  </div>
                )
              )}

            </div>

          </div>

          </div>
        </details>

        {/* コラム管理 */}
        <details className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-lg group">
          <summary className="flex cursor-pointer list-none items-center justify-between p-7 font-black text-slate-900 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-4">
              <span className="text-3xl">📝</span>
              <div>
                <h2 className="text-2xl font-black">
                  コラム管理
                </h2>
                <p className="mt-1 text-sm font-normal text-slate-500">
                  コラムの作成・編集・公開を管理
                </p>
              </div>
            </div>

            <span className="text-2xl text-slate-400 transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>

          <div className="border-t border-slate-100 p-7">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-2xl font-black text-slate-900">
                📝 コラム管理
              </h2>

              <p className="mt-2 text-slate-500">
                AI News ジャパンの独自コラムを作成・公開できます。
              </p>
            </div>

            <button
              onClick={loadColumns}
              disabled={columnListLoading}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {columnListLoading ? "更新中..." : "🔄 一覧を更新"}
            </button>

          </div>

          {/* 新規コラム作成 */}
          <div className="mt-6 rounded-2xl bg-slate-50 p-6">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xl font-black text-slate-900">
                {editingColumnId !== null
                  ? "✏️ コラムを編集"
                  : "新しいコラムを作成"}
              </h3>

              {editingColumnId !== null && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                  編集中
                </span>
              )}
            </div>

            <div className="mt-5 space-y-5">

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  タイトル
                </label>

                <input
                  type="text"
                  value={columnTitle}
                  onChange={(e) => setColumnTitle(e.target.value)}
                  placeholder="例：AIニュースサイトを作ってみた"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  URL用slug
                </label>

                <input
                  type="text"
                  value={columnSlug}
                  onChange={(e) => setColumnSlug(e.target.value)}
                  placeholder="ai-news-site"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-2 text-xs text-slate-400">
                  URLは /column/slug になります。
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  概要
                </label>

                <textarea
                  value={columnExcerpt}
                  onChange={(e) => setColumnExcerpt(e.target.value)}
                  rows={3}
                  placeholder="コラムの内容を短く説明してください。"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <div className="mb-2 flex items-end justify-between">
                  <div>
                    <label className="block text-sm font-bold text-slate-700">
                      本文
                    </label>

                    <p className="mt-1 text-xs text-slate-400">
                      読み物として自然に読めるよう、段落ごとに改行して入力してください。
                    </p>
                  </div>

                  <span className="text-xs font-bold text-slate-400">
                    {columnContent.length.toLocaleString()}文字
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">

                  <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-slate-500 shadow-sm">
                      本文
                    </span>

                    <span className="text-xs text-slate-400">
                      段落ごとに改行してください
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
                    <label
                      className={`cursor-pointer rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-600 ${
                        columnImageUploading
                          ? "pointer-events-none opacity-50"
                          : ""
                      }`}
                    >
                      {columnImageUploading
                        ? "📤 アップロード中..."
                        : "🖼️ 漫画画像を挿入"}

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={columnImageUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];

                          if (!file) return;

                          setColumnImageUploading(true);

                          try {
                            const formData = new FormData();
                            formData.append("file", file);

                            const res = await fetch(
                              "/api/column/upload",
                              {
                                method: "POST",
                                body: formData,
                              }
                            );

                            const data = await res.json();

                            if (!res.ok || !data.success) {
                              throw new Error(
                                data.error ??
                                  "画像のアップロードに失敗しました"
                              );
                            }

                            const imageTag =
  `\n[IMAGE:${data.url}]\n`;

                            setColumnContent((current) => {
                              return current + imageTag;
                            });

                          } catch (error) {
                            console.error(error);

                            alert(
                              error instanceof Error
                                ? error.message
                                : "画像のアップロードに失敗しました"
                            );
                          } finally {
                            setColumnImageUploading(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>

                    <span className="text-xs text-slate-400">
                      PNG / JPG / WebP
                    </span>
                  </div>

                  <textarea
                    value={columnContent}
                    onChange={(e) => setColumnContent(e.target.value)}
                    rows={20}
                    placeholder={`ここからコラムを書いてください。

例えば、

AIについて考えていたら、ふと昔のことを思い出した。

あの頃は、まさか自分がAIを使ってニュースサイトを作るなんて思ってもいなかった。

そんな出来事を、少しずつ書いていきます。`}
                    className="min-h-[500px] w-full resize-y border-0 px-5 py-5 text-base leading-8 text-slate-700 outline-none placeholder:text-slate-300"
                  />

                </div>

                <div className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-xs leading-6 text-slate-500">
                  <span className="font-bold text-blue-600">
                    💡 書き方のコツ
                  </span>
                  <br />
                  文章のまとまりごとに1行空けると、公開ページでも読みやすい記事になります。
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  アイキャッチ画像
                </label>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">

                  {columnImage && (
                    <div className="h-[390px] overflow-hidden bg-slate-100">
                      <img
                        src={columnImage}
                        alt="アイキャッチ画像プレビュー"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-4">

                    <label
                      className={`inline-flex cursor-pointer items-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 ${
                        columnImageUploading
                          ? "pointer-events-none opacity-50"
                          : ""
                      }`}
                    >
                      {columnImageUploading
                        ? "📤 アップロード中..."
                        : "🖼️ アイキャッチ画像をアップロード"}

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={columnImageUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];

                          if (!file) return;

                          setColumnImageUploading(true);

                          try {
                            const formData = new FormData();
                            formData.append("file", file);

                            const res = await fetch(
                              "/api/column/upload",
                              {
                                method: "POST",
                                body: formData,
                              }
                            );

                            const data = await res.json();

                            if (!res.ok || !data.success) {
                              throw new Error(
                                data.error ??
                                  "画像のアップロードに失敗しました"
                              );
                            }

                            setColumnImage(data.url);

                          } catch (error) {
                            console.error(error);

                            alert(
                              error instanceof Error
                                ? error.message
                                : "画像のアップロードに失敗しました"
                            );
                          } finally {
                            setColumnImageUploading(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>

                    <p className="mt-3 text-xs leading-5 text-slate-400">
                      PNG / JPG / WebP・10MBまで
                    </p>

                    {columnImage && (
                      <p className="mt-2 break-all text-xs text-slate-400">
                        {columnImage}
                      </p>
                    )}

                  </div>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={columnIsPublished}
                  onChange={(e) => setColumnIsPublished(e.target.checked)}
                  className="h-5 w-5"
                />

                <span className="font-bold text-slate-700">
                  公開する
                </span>
              </label>

              {editingColumnId !== null ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={updateColumn}
                    disabled={columnEditLoading}
                    className="rounded-2xl bg-blue-600 px-6 py-4 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {columnEditLoading
                      ? "更新中..."
                      : "💾 変更を保存する"}
                  </button>

                  <button
                    onClick={cancelEditColumn}
                    disabled={columnEditLoading}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-4 font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    編集をキャンセル
                  </button>
                </div>
              ) : (
                <button
                  onClick={registerColumn}
                  disabled={columnLoading}
                  className="w-full rounded-2xl bg-blue-600 px-6 py-4 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {columnLoading
                    ? "登録中..."
                    : "📝 コラムを登録する"}
                </button>
              )}

            </div>

          </div>

          {/* 登録済みコラム */}
          <div className="mt-8 border-t border-slate-200 pt-8">

            <h3 className="text-xl font-black text-slate-900">
              📚 登録済みコラム
            </h3>

            {!columnListLoading && columns.length === 0 && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                登録されているコラムはありません。
              </div>
            )}

            <div className="mt-4 space-y-4">

              {columns.map((column) => (
                <div
                  key={column.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-center gap-2">

                        <h4 className="text-lg font-black text-slate-900">
                          {column.title}
                        </h4>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            column.isPublished
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {column.isPublished ? "公開" : "非公開"}
                        </span>

                      </div>

                      <p className="mt-2 text-sm font-mono text-slate-400">
                        /column/{column.slug}
                      </p>

                      {column.excerpt && (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {column.excerpt}
                        </p>
                      )}

                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">

                      {column.isPublished && (
                        <a
                          href={`/column/${column.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-black text-white hover:bg-blue-700"
                        >
                          🔗 コラムを見る
                        </a>
                      )}

                      <button
                        onClick={() => startEditColumn(column)}
                        className="rounded-xl bg-amber-50 px-5 py-3 text-sm font-black text-amber-700 hover:bg-amber-100"
                      >
                        ✏️ 編集
                      </button>

                      <button
                        onClick={() =>
                          deleteColumn(column.id, column.title)
                        }
                        disabled={columnDeleteLoading === column.id}
                        className="rounded-xl bg-red-50 px-5 py-3 text-sm font-black text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        {columnDeleteLoading === column.id
                          ? "削除中..."
                          : "🗑️ 削除"}
                      </button>

                    </div>

                  </div>

                </div>
              ))}

            </div>

          </div>

          </div>
        </details>

        {/* シェア分析 */}
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">

          <h2 className="text-2xl font-black text-slate-900">
            📊 シェア分析
          </h2>

          <p className="mt-2 text-slate-500">
            X・LINEのシェア状況を確認できます。
          </p>

          <Link
            href="/share-stats"
            className="mt-6 block rounded-2xl bg-blue-600 px-6 py-4 text-center font-black text-white transition hover:bg-blue-700"
          >
            📊 シェア分析を見る →
          </Link>

        </section>

        {/* トップページ */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">

          <Link
            href="/"
            className="block rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-center font-black text-slate-900 transition hover:bg-blue-50"
          >
            🏠 トップページへ →
          </Link>

        </div>

      </div>
        {/* リクエストBOX */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-7 sm:shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-4xl">
                📩
              </div>

              <h2 className="mt-2 text-xl font-black text-slate-900 sm:mt-4 sm:text-2xl">
                リクエストBOX
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                読者から届いた記事・特集リクエストを確認できます。
              </p>
            </div>

            <button
              type="button"
              onClick={loadContentRequests}
              disabled={contentRequestsLoading}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {contentRequestsLoading
                ? "更新中..."
                : "一覧を更新"}
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {contentRequests.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
                {contentRequestsLoading
                  ? "リクエストを読み込んでいます..."
                  : "リクエストはありません"}
              </div>
            ) : (
              contentRequests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-2xl border border-slate-200 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                    <span>
                      {new Date(
                        request.createdAt
                      ).toLocaleString("ja-JP")}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                      {request.status === "pending"
                        ? "未対応"
                        : request.status === "done"
                        ? "対応済み"
                        : "却下"}
                    </span>

                    {request.name && (
                      <span>
                        投稿者：{request.name}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-800">
                    {request.message}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch(
                            "/api/admin/content-request",
                            {
                              method: "PUT",
                              headers: {
                                "Content-Type":
                                  "application/json",
                              },
                              body: JSON.stringify({
                                id: request.id,
                                status: "done",
                              }),
                            }
                          );

                          const data = await res.json();

                          if (!res.ok || !data.success) {
                            throw new Error(
                              data.error ??
                                "更新に失敗しました"
                            );
                          }

                          await loadContentRequests();
                        } catch (error) {
                          setMessage(
                            error instanceof Error
                              ? error.message
                              : "更新に失敗しました"
                          );
                        }
                      }}
                      className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700"
                    >
                      対応済みにする
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            "このリクエストを却下しますか？"
                          )
                        ) {
                          return;
                        }

                        try {
                          const res = await fetch(
                            "/api/admin/content-request",
                            {
                              method: "PUT",
                              headers: {
                                "Content-Type":
                                  "application/json",
                              },
                              body: JSON.stringify({
                                id: request.id,
                                status: "rejected",
                              }),
                            }
                          );

                          const data = await res.json();

                          if (!res.ok || !data.success) {
                            throw new Error(
                              data.error ??
                                "更新に失敗しました"
                            );
                          }

                          await loadContentRequests();
                        } catch (error) {
                          setMessage(
                            error instanceof Error
                              ? error.message
                              : "更新に失敗しました"
                          );
                        }
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      却下
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            "このリクエストを削除しますか？"
                          )
                        ) {
                          return;
                        }

                        try {
                          const res = await fetch(
                            `/api/admin/content-request?id=${request.id}`,
                            {
                              method: "DELETE",
                            }
                          );

                          const data = await res.json();

                          if (!res.ok || !data.success) {
                            throw new Error(
                              data.error ??
                                "削除に失敗しました"
                            );
                          }

                          await loadContentRequests();
                        } catch (error) {
                          setMessage(
                            error instanceof Error
                              ? error.message
                              : "削除に失敗しました"
                          );
                        }
                      }}
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
                    >
                      削除
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

    </main>
  );
}