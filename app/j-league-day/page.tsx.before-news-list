"use client";

import { useEffect, useState } from "react";
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

  return `${year}年${month}月${day}日（${weekdays[date.getDay()]}）`;
}

export default function JLeagueDayPage() {
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
    return (
      <main className="jleague-page">
        <section className="jleague-hero">
          <div className="jleague-badge">⚽ J.LEAGUE DAY</div>
          <h1>次回のJリーグDAYは準備中です</h1>
        </section>
      </main>
    );
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

  const hours = Math.max(
    0,
    Math.floor((diff / (1000 * 60 * 60)) % 24)
  );

  const minutes = Math.max(
    0,
    Math.floor((diff / (1000 * 60)) % 60)
  );

  const seconds = Math.max(
    0,
    Math.floor((diff / 1000) % 60)
  );

  return (
    <main className="jleague-page">
      <section className="jleague-hero">
        <div className="jleague-badge">
          ⚽ J.LEAGUE DAY
        </div>

        {isToday ? (
          <>
            <h1>本日はJリーグDAY！</h1>

            <p className="lead">
              今日はJリーグのニュースを
              <br />
              いつもより多めにお届けします。
            </p>

            <p className="lead">
              J1 <strong>{nextDay.j1Matches}試合</strong> 開催
            </p>
          </>
        ) : (
          <>
            <p className="small-title">
              次回開催まで
            </p>

            <div className="countdown">
              <div>
                <strong>{days}</strong>
                <span>日</span>
              </div>

              <div>
                <strong>{hours}</strong>
                <span>時間</span>
              </div>

              <div>
                <strong>{minutes}</strong>
                <span>分</span>
              </div>

              <div>
                <strong>{seconds}</strong>
                <span>秒</span>
              </div>
            </div>

            <h1>
              JリーグDAYまであと{days}日
            </h1>

            <p className="lead">
              次回のJリーグDAYは
              <br />
              <strong>{formatDate(nextDay.date)}</strong>
            </p>
          </>
        )}
      </section>

      <section className="jleague-content">
        <h2>⚽ JリーグDAY</h2>

        <p>
          AI NEWSジャパンでは、Jリーグの試合が多く開催される日を
          「JリーグDAY」として、サッカーニュースをいつもより多めにお届けします。
        </p>

        <div className="coming-card">
          <span>AI NEWS JAPAN</span>

          <h3>Jリーグニュース</h3>

          <p>
            試合情報・結果・注目ニュースなどを、
            今後このページにまとめていきます。
          </p>
        </div>
      </section>
    </main>
  );
}