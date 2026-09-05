"use client";

import { useEffect, useRef } from "react";

type Props = {
  type: "page-match" | "ranking";
  genreId?: string;
};

export default function RakutenWidget({
  type,
  genreId = "0",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    container.innerHTML = "";

    const config = document.createElement("script");
    config.type = "text/javascript";
    config.text = `
      rakuten_design="slide";
      rakuten_affiliateId="57306437.624edf72.57306438.8f4aa83f";
      rakuten_items="${type === "page-match" ? "ctsmatch" : "ranking"}";
      rakuten_genreId="${genreId}";
      rakuten_size="728x200";
      rakuten_target="_blank";
      rakuten_theme="gray";
      rakuten_border="${type === "page-match" ? "on" : "off"}";
      rakuten_auto_mode="on";
      rakuten_genre_title="off";
      rakuten_recommend="on";
      rakuten_ts="${Date.now()}";
    `;

    const loader = document.createElement("script");
    loader.type = "text/javascript";
    loader.src =
      "https://xml.affiliate.rakuten.co.jp/widget/js/rakuten_widget.js?20230106";

    container.appendChild(config);
    container.appendChild(loader);

    return () => {
      container.innerHTML = "";
    };
  }, [type, genreId]);

  return (
    <div className="my-8 flex w-full justify-center overflow-hidden">
      <div ref={containerRef} className="w-full max-w-[728px]" />
    </div>
  );
}
