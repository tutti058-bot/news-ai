"use client";

import { useEffect, useRef } from "react";

type Props = {
  type: "page-match" | "ranking";
};

export default function RakutenWidget({ type }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const widgetScript = document.createElement("script");
    widgetScript.type = "text/javascript";
    widgetScript.text = `
      rakuten_design="slide";
      rakuten_affiliateId="57306437.624edf72.57306438.8f4aa83f";
      rakuten_items="${type === "page-match" ? "ctsmatch" : "ranking"}";
      rakuten_genreId="0";
      rakuten_size="468x160";
      rakuten_target="_blank";
      rakuten_theme="gray";
      rakuten_border="off";
      rakuten_auto_mode="on";
      rakuten_genre_title="off";
      rakuten_recommend="on";
      rakuten_ts="${Date.now()}";
    `;

    const loaderScript = document.createElement("script");
    loaderScript.type = "text/javascript";
    loaderScript.src =
      "https://xml.affiliate.rakuten.co.jp/widget/js/rakuten_widget.js?20230106";

    container.appendChild(widgetScript);
    container.appendChild(loaderScript);

    return () => {
      container.innerHTML = "";
    };
  }, [type]);

  return (
    <div className="my-6 flex w-full justify-center overflow-hidden sm:my-8">
      <div
        ref={containerRef}
        className="w-full max-w-[468px] overflow-hidden"
      />
    </div>
  );
}
