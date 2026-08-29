export type JLeagueDay = {
  date: string;
  j1Matches: number;
};

export const jLeagueDays: JLeagueDay[] = [
  {
    date: "2026-08-29",
    j1Matches: 10,
  },
  {
    date: "2026-09-02",
    j1Matches: 10,
  },
  {
    date: "2026-09-06",
    j1Matches: 8,
  },
  {
    date: "2026-09-12",
    j1Matches: 6,
  },
];

export const J_LEAGUE_DAY_THRESHOLD = 6;

export function isJLeagueDay(date: string) {
  const day = jLeagueDays.find((item) => item.date === date);

  return day !== undefined && day.j1Matches >= J_LEAGUE_DAY_THRESHOLD;
}

export function getNextJLeagueDay(today: string) {
  return (
    jLeagueDays
      .filter((item) => item.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  );
}