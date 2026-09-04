import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSoccerViewRanking } from "@/lib/ranking";

export const dynamic = "force-dynamic";

function getSoccerCategory(
  title: string,
  summary: string,
  source: string
) {
  const text = `${title} ${summary} ${source}`;
  const normalized = text.toLowerCase();

  // =========================
  // 日本代表
  // =========================
  // 「代表戦」「W杯」だけでは日本代表と判定しない。
  // 日本代表であることが明確な場合のみ分類する。
  const japanNationalPattern =
    /日本代表|samurai blue|サムライブルー|日本代表メンバー|日本代表招集|日本代表戦|日本代表の|日本代表が|日本代表は|日本代表選手|日本代表監督|日本代表候補/iu;

  if (japanNationalPattern.test(text)) {
    return "日本代表";
  }

  // 日本代表 + W杯などの組み合わせ
  const japanWithTournamentPattern =
    /日本.*(?:w杯|ワールドカップ|アジアカップ|アジア杯|国際大会)|(?:w杯|ワールドカップ|アジアカップ|アジア杯).*日本代表/iu;

  if (japanWithTournamentPattern.test(text)) {
    return "日本代表";
  }

  // =========================
  // Jリーグ
  // =========================
  const jLeaguePattern =
    /jリーグ|j1|j2|j3|jクラブ|jリーガー|元jリーガー|浦和レッズ|鹿島アントラーズ|fc東京|東京ヴェルディ|川崎フロンターレ|横浜f・マリノス|横浜fc|湘南ベルマーレ|柏レイソル|アルビレックス新潟|清水エスパルス|名古屋グランパス|京都サンガ|ガンバ大阪|セレッソ大阪|ヴィッセル神戸|サンフレッチェ広島|アビスパ福岡|ファジアーノ岡山|町田ゼルビア/iu;

  if (jLeaguePattern.test(text)) {
    return "Jリーグ";
  }

  // =========================
  // 海外日本人
  // =========================
  // 「日本人選手」だけでは判定しない。
  // 海外リーグ・海外クラブとの組み合わせを重視する。
  const overseasJapanesePattern =
    /海外日本人|海外組|海外でプレー|海外で活躍|欧州.*日本人|日本人.*欧州|日本人選手.*(?:プレミア|ラ・リーガ|リーガ|セリエa|ブンデス|リーグ・アン|海外)|(?:プレミア|ラ・リーガ|リーガ|セリエa|ブンデス|リーグ・アン|海外).*日本人選手|三笘薫|久保建英|遠藤航|堂安律|南野拓実|鎌田大地|冨安健洋|守田英正|上田綺世|古橋亨梧|前田大然|旗手怜央|板倉滉|菅原由勢|伊東純也|浅野拓磨/iu;

  if (overseasJapanesePattern.test(text)) {
    return "海外日本人";
  }

  // =========================
  // 海外サッカー
  // =========================
  const overseasPattern =
    /プレミアリーグ|ラ・リーガ|リーガ・エスパニョーラ|セリエa|ブンデスリーガ|リーグ・アン|チャンピオンズリーグ|ヨーロッパリーグ|europa league|uefa|fifa|レアル・マドリー|レアル・マドリード|バルセロナ|マンチェスター|リヴァプール|アーセナル|チェルシー|トッテナム|バイエルン|ドルトムント|インテル|ミラン|ユベントス|パリsg|パリ・サンジェルマン|アルゼンチン代表|ブラジル代表|フランス代表|スペイン代表|イングランド代表|ドイツ代表|イタリア代表/iu;

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
    // ゲキサカ記事とその他記事を並列取得
    const [soccerNews, otherNews] = await Promise.all([
      prisma.news.findMany({
        where: {
          source: "ゲキサカ",
        },
        orderBy: {
          publishedAt: "desc",
        },
        take: 50,
      }),
      prisma.news.findMany({
        where: {
          AND: [
            {
              source: {
                not: "ゲキサカ",
              },
            },
            {
              OR: [
                { title: { contains: "Jリーグ" } },
                { title: { contains: "J1" } },
                { title: { contains: "J2" } },
                { title: { contains: "J3" } },
                { title: { contains: "浦和レッズ" } },
                { title: { contains: "鹿島アントラーズ" } },
                { title: { contains: "FC東京" } },
                { title: { contains: "東京ヴェルディ" } },
                { title: { contains: "川崎フロンターレ" } },
                { title: { contains: "横浜F・マリノス" } },
                { title: { contains: "横浜FC" } },
                { title: { contains: "湘南ベルマーレ" } },
                { title: { contains: "柏レイソル" } },
                { title: { contains: "アルビレックス新潟" } },
                { title: { contains: "清水エスパルス" } },
                { title: { contains: "名古屋グランパス" } },
                { title: { contains: "京都サンガ" } },
                { title: { contains: "ガンバ大阪" } },
                { title: { contains: "セレッソ大阪" } },
                { title: { contains: "ヴィッセル神戸" } },
                { title: { contains: "サンフレッチェ広島" } },
                { title: { contains: "アビスパ福岡" } },
                { title: { contains: "ファジアーノ岡山" } },
                { title: { contains: "町田ゼルビア" } },
                { title: { contains: "Jリーガー" } },
                { title: { contains: "元Jリーガー" } },
              ],
            },
          ],
        },
        orderBy: {
          publishedAt: "desc",
        },
        take: 100,
      }),
    ]);

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

    // 現在のJ.LEAGUE DAYでは閲覧ランキングのみ使用
    const [soccerViewWeekly, soccerViewMonthly] =
      await Promise.all([
        getSoccerViewRanking("weekly"),
        getSoccerViewRanking("monthly"),
      ]);

    return NextResponse.json({
      news: uniqueNews.slice(0, 20),
      rankings: {
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
