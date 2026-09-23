"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load: (element?: HTMLElement) => void;
      };
    };
  }
}

export default function XTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadTimeline = () => {
      if (window.twttr?.widgets && containerRef.current) {
        window.twttr.widgets.load(containerRef.current);
      }
    };

    const existingScript = document.querySelector(
      'script[src="https://platform.twitter.com/widgets.js"]'
    );

    if (existingScript) {
      loadTimeline();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.charset = "utf-8";
    script.onload = loadTimeline;

    document.body.appendChild(script);
  }, []);

  return (
    <section className="mb-6 rounded-3xl bg-white p-4 shadow-sm sm:mb-8 sm:p-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-wider text-blue-600">
            𝕏 X TIMELINE
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
            AI NEWSジャパンのX
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            最新のX投稿をチェック
          </p>
        </div>

        <a
          href="https://x.com/news_ai_tutti"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800"
        >
          Xで見る
        </a>
      </div>

      <div ref={containerRef} className="overflow-hidden rounded-2xl">
        <a
          className="twitter-timeline"
          data-height="600"
          data-dnt="true"
          href="https://x.com/news_ai_tutti"
        >
          AI NEWSジャパン @news_ai_tutti
        </a>
      </div>
    </section>
  );
}
