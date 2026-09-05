"use client";

import Script from "next/script";

type Props = {
  type: "page-match" | "ranking";
};

export default function RakutenWidget({ type }: Props) {
  const items = type === "page-match" ? "ctsmatch" : "ranking";

  return (
    <div className="my-8 flex justify-center overflow-hidden">
      <div className="w-full max-w-[468px] min-h-[160px]">
        <Script id={`rakuten-config-${type}`}>
          {`
            rakuten_design="slide";
            rakuten_affiliateId="57306437.624edf72.57306438.8f4aa83f";
            rakuten_items="${items}";
            rakuten_genreId="0";
            rakuten_size="468x160";
            rakuten_target="_blank";
            rakuten_theme="gray";
            rakuten_border="off";
            rakuten_auto_mode="on";
            rakuten_genre_title="off";
            rakuten_recommend="on";
            rakuten_ts="${Date.now()}";
          `}
        </Script>

        <Script
          src="https://xml.affiliate.rakuten.co.jp/widget/js/rakuten_widget.js?20230106"
          strategy="afterInteractive"
        />
      </div>
    </div>
  );
}
