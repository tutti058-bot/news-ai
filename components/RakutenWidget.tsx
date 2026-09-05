"use client";

import Script from "next/script";

export default function RakutenWidget() {
  return (
    <div className="my-8 flex w-full justify-center overflow-hidden">
      <div className="w-full max-w-[728px] min-h-[200px]">
        <Script id="rakuten-config" strategy="afterInteractive">
          {`
            rakuten_design="slide";
            rakuten_affiliateId="57306437.624edf72.57306438.8f4aa83f";
            rakuten_items="ctsmatch";
            rakuten_genreId="0";
            rakuten_size="728x200";
            rakuten_target="_blank";
            rakuten_theme="gray";
            rakuten_border="on";
            rakuten_auto_mode="on";
            rakuten_genre_title="off";
            rakuten_recommend="on";
            rakuten_ts="${Date.now()}";
          `}
        </Script>

        <Script
          id="rakuten-loader"
          src="https://xml.affiliate.rakuten.co.jp/widget/js/rakuten_widget.js?20230106"
          strategy="afterInteractive"
        />
      </div>
    </div>
  );
}
