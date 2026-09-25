"use client";

import Script from "next/script";

const ELEMENT_ID = "im-ec6ec57f819c4c5d95721deb20eeca6a";

export default function IMobileAd() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
      <div className="flex items-center justify-between px-5 py-3">
        <span className="text-[10px] font-black tracking-[0.2em] text-slate-400">
          ADVERTISEMENT
        </span>
      </div>

      <div id={ELEMENT_ID}>
        <Script id="imobile-pc-config" strategy="afterInteractive">
          {`
            window.adsbyimobile = window.adsbyimobile || [];
            window.adsbyimobile.push({
              pid: 85395,
              mid: 596062,
              asid: 1944290,
              type: "banner",
              display: "inline",
              elementid: "${ELEMENT_ID}"
            });
          `}
        </Script>

        <Script
          src="https://imp-adedge.i-mobile.co.jp/script/v1/spot.js?20220104"
          strategy="afterInteractive"
        />
      </div>
    </div>
  );
}
