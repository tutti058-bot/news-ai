import * as cheerio from "cheerio";

export type LeagueType = "j1" | "j2" | "j3";

export type JLeagueStanding = {
  rank: number;
  club: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalDiff: number;
};

const LEAGUE_URLS: Record<LeagueType, string> = {
  j1: "https://www.jleague.jp/j1/standings/",
  j2: "https://www.jleague.jp/j2/standings/",
  j3: "https://www.jleague.jp/j3/standings/",
};

function parseStandings(html: string): JLeagueStanding[] {
  const normalizedHtml = html.replace(/\\"/g, '"');

  const pattern =
    /"club":\{[\s\S]*?"name":"([^"]+)"[\s\S]*?"shortName":"([^"]+)"[\s\S]*?\},"point":(\d+),"match":(\d+),"win":(\d+),"draw":(\d+),"loss":(\d+),"goalScored":(\d+),"goalLost":(\d+),"goalDifference":(-?\d+)/g;

  const standings: JLeagueStanding[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(normalizedHtml)) !== null) {
    standings.push({
      rank: standings.length + 1,
      club: match[1],
      points: Number(match[3]),
      played: Number(match[4]),
      wins: Number(match[5]),
      draws: Number(match[6]),
      losses: Number(match[7]),
      goalDiff: Number(match[10]),
    });
  }

  if (standings.length >= 3) {
    return standings.slice(0, 30);
  }

  // フォールバック：HTMLテーブル
  const $ = cheerio.load(html);
  const fallback: JLeagueStanding[] = [];

  $("table tbody tr").each((index, row) => {
    const cells = $(row)
      .find("th, td")
      .map((_, cell) =>
        $(cell).text().replace(/\s+/g, " ").trim()
      )
      .get();

    if (cells.length < 7) return;

    const rank = Number.parseInt(
      cells[0].replace(/\D/g, ""),
      10
    );

    const club = cells[1];

    if (!Number.isNaN(rank) && club) {
      fallback.push({
        rank: index + 1,
        club,
        points: Number.parseInt(cells[2], 10) || 0,
        played: Number.parseInt(cells[3], 10) || 0,
        wins: Number.parseInt(cells[4], 10) || 0,
        draws: Number.parseInt(cells[5], 10) || 0,
        losses: Number.parseInt(cells[6], 10) || 0,
        goalDiff:
          Number.parseInt(cells[9], 10) || 0,
      });
    }
  });

  return fallback.slice(0, 30);
}

export async function getJLeagueStandings(
  league: LeagueType
): Promise<JLeagueStanding[]> {
  try {
    const response = await fetch(LEAGUE_URLS[league], {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      next: {
        revalidate: 3600,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Jリーグ${league.toUpperCase()}順位表取得失敗: ${response.status}`
      );
    }

    const html = await response.text();

    return parseStandings(html);
  } catch (error) {
    console.error(
      `Jリーグ${league.toUpperCase()}順位表取得エラー:`,
      error
    );

    return [];
  }
}

// 既存コード互換用
export async function getJ1Standings(): Promise<JLeagueStanding[]> {
  return getJLeagueStandings("j1");
}
