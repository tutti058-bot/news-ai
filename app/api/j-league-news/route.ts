import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSoccerImportanceRanking, getSoccerViewRanking } from "@/lib/ranking";

export const dynamic = "force-dynamic";

function getSoccerCategory(
  title: string,
  summary: string,
  source: string
) {
  const text =
    `${title} ${summary} ${source}`.toLowerCase();

  // 日本代表
  const japanPattern =
    /日本代表|samurai blue|サムライブルー|代表戦|代表メンバー|代表招集|代表招集|w杯|ワールドカップ/iu;

  if (japanPattern.test(text)) {
    return "日本代表";
  }

  // 海外日本人
  const overseasJapanesePattern =
    /海外日本人|海外組|海外でプレー|欧州.*日本人|日本人.*欧州|日本人選手|[^\s]+(?:伊藤|三笘|久保|遠藤|堂安|南野|鎌田|鈴木|冨安|守田|上田|古橋|前田|旗手|町田|板倉|菅原|伊東|浅野)/iu;

  if (overseasJapanesePattern.test(text)) {
    return "海外日本人";
  }

  // Jリーグ
  const jLeaguePattern =
    /jリーグ|j1|j2|j3|jクラブ|浦和レッズ|鹿島アントラーズ|fc東京|東京ヴェルディ|川崎フロンターレ|横浜f・マリノス|横浜fc|湘南ベルマーレ|柏レイソル|アルビレックス新潟|清水エスパルス|名古屋グランパス|京都サンガ|ガンバ大阪|セレッソ大阪|ヴィッセル神戸|サンフレッチェ広島|アビスパ福岡|ファジアーノ岡山|町田ゼルビア/iu;

  if (jLeaguePattern.test(text)) {
    return "Jリーグ";
  }

  // 海外クラブ・海外リーグ
  const overseasPattern =
    /プレミアリーグ|ラ・リーガ|リーガ|セリエa|ブンデスリーガ|リーグ・アン|チャンピオンズリーグ|europa|uefa|fifa|レアル・マドリー|レアル・マドリード|バルセロナ|マンチェスター|リヴァプール|アーセナル|チェルシー|バイエルン|ドルトムント|インテル|ミラン|ユベントス|パリsg/iu;

  if (overseasPattern.test(text)) {
    return "海外サッカー";
  }

  return "その他";
}

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
    ).map((item) => ({
      ...item,
      soccerCategory: getSoccerCategory(
        item.title ?? "",
        item.summary ?? "",
        item.source ?? ""
      ),
    }));

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

    const soccerImportanceWeekly =
      await getSoccerImportanceRanking("weekly");

    const soccerImportanceMonthly =
      await getSoccerImportanceRanking("monthly");

    const soccerViewWeekly =
      await getSoccerViewRanking("weekly");

    const soccerViewMonthly =
      await getSoccerViewRanking("monthly");

    return NextResponse.json({
      news: uniqueNews.slice(0, 20),
      rankings: {
        importance: {
          weekly: soccerImportanceWeekly,
          monthly: soccerImportanceMonthly,
        },
        views: {
          weekly: soccerViewWeekly,
          monthly: soccerViewMonthly,
        },
      },
    });
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
