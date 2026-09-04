import { NextResponse } from "next/server";
import {
  getJLeagueStandings,
  type LeagueType,
} from "@/lib/jLeagueStandings";

const validLeagues: LeagueType[] = ["j1", "j2", "j3"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const league = searchParams.get("league") as LeagueType | null;

  if (!league || !validLeagues.includes(league)) {
    return NextResponse.json(
      { error: "league must be j1, j2, or j3" },
      { status: 400 }
    );
  }

  const standings = await getJLeagueStandings(league);

  return NextResponse.json(standings);
}
