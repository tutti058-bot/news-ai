"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getNextJLeagueDay } from "@/lib/jLeagueDays";

function getTodayString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  return `${month}月${day}日（${weekdays[date.getDay()]}）`;
}

export default function JLeagueDayCard() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const today = getTodayString();
  const nextDay = getNextJLeagueDay(today);

  if (!nextDay) {
    return null;
  }

  const [year, month, day] = nextDay.date.split("-").map(Number);

  const eventDate = new Date(year, month - 1, day);
  const isToday =
    now.getFullYear() === eventDate.getFullYear() &&
    now.getMonth() === eventDate.getMonth() &&
    now.getDate() === eventDate.getDate();

  const diff = eventDate.getTime() - now.getTime();

  const days = Math.max(
    0,
    Math.ceil(diff / (1000 * 60 * 60 * 24))
  );

  return (
    <section className="jleague-home-card">
      <div className="jleague-home-card-inner">

        <div className="jleague-home-badge">
          ⚽ J.LEAGUE DAY
        </div>

        {isToday ? (
          <>
            <div className="jleague-home-count">
              <span>本日は</span>
              <strong>JリーグDAY！</strong>
            </div>

            <p>
              J1 <strong>{nextDay.j1Matches}試合</strong> 開催
            </p>
          </>
        ) : (
          <>
            <div className="jleague-home-count">
              <span>次回開催まであと</span>
              <strong>{days}日</strong>
            </div>

            <p>
              次回のJリーグDAYは{" "}
              <strong>{formatDate(nextDay.date)}</strong>
            </p>
          </>
        )}

        <Link
          href="/j-league-day"
          className="jleague-home-link"
        >
          サッカー記事はこちら →
        </Link>

      </div>
    </section>
  );
}