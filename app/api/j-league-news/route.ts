import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isJLeagueRelated(
  title: string,
  summary: string,
  source: string
) {
  const text = `${title} ${summary} ${source}`.toLowerCase();

  const keywords = [
    "jリーグ",
    "j1",
    "j2",
    "j3",

    // Jリーグクラブ
    "浦和レッズ",
    "鹿島アントラーズ",
    "fc東京",
    "東京ヴェルディ",
    "川崎フロンターレ",
    "横浜f・マリノス",
    "横浜fc",
    "湘南ベルマーレ",
    "柏レイソル",
    "アルビレックス新潟",
    "清水エスパルス",
    "名古屋グランパス",
    "京都サンガ",
    "ガンバ大阪",
    "セレッソ大阪",
    "ヴィッセル神戸",
    "サンフレッチェ広島",
    "アビスパ福岡",
    "ファジアーノ岡山",
    "町田ゼルビア",

    "jリーガー",
    "元jリーガー",
  ];

  return keywords.some((keyword) =>
    text.includes(keyword.toLowerCase())
  );
}

export async function GET() {
  try {
    // まずゲキサカ記事を直接取得
    const soccerNews = await prisma.news.findMany({
      where: {
        source: "ゲキサカ",
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 50,
    });

    // その他の最新記事からJリーグ関連記事を探す
    const otherNews = await prisma.news.findMany({
      where: {
        source: {
          not: "ゲキサカ",
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 300,
    });

    const jLeagueRelatedNews = otherNews.filter((item) =>
      isJLeagueRelated(
        item.title ?? "",
        item.summary ?? "",
        item.source ?? ""
      )
    );

    // 重複なしで結合
    const allNews = [
      ...soccerNews,
      ...jLeagueRelatedNews,
    ];

    const uniqueNews = Array.from(
      new Map(
        allNews.map((item) => [item.id, item])
      ).values()
    );

    // 日付順
    uniqueNews.sort((a, b) => {
      const aTime = a.publishedAt
        ? new Date(a.publishedAt).getTime()
        : 0;

      const bTime = b.publishedAt
        ? new Date(b.publishedAt).getTime()
        : 0;

      return bTime - aTime;
    });

    return NextResponse.json(
      uniqueNews.slice(0, 20)
    );
  } catch (error) {
    console.error(
      "Jリーグニュース取得エラー:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Jリーグニュースの取得に失敗しました",
      },
      {
        status: 500,
      }
    );
  }
}
