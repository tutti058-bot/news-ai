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
    const news = await prisma.news.findMany({
      orderBy: {
        publishedAt: "desc",
      },
      take: 100,
    });

    const jLeagueNews = news
      .filter((item) => {
        const source = item.source ?? "";

        // ゲキサカから取得した記事は
        // サッカー記事としてJリーグDAYページに表示
        if (source === "ゲキサカ") {
          return true;
        }

        // 他のニュースソースでも
        // Jリーグ関連なら表示
        return isJLeagueRelated(
          item.title ?? "",
          item.summary ?? "",
          source
        );
      })
      .slice(0, 20);

    return NextResponse.json(jLeagueNews);
  } catch (error) {
    console.error("Jリーグニュース取得エラー:", error);

    return NextResponse.json(
      {
        error: "Jリーグニュースの取得に失敗しました",
      },
      {
        status: 500,
      }
    );
  }
}
