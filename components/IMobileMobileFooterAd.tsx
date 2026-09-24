"use client";

import Script from "next/script";

const ELEMENT_ID = "im-f40fd98776dc406d8937f18fd989631b";

export default function IMobileMobileFooterAd() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[99998] text-center md:hidden"
      style={{
        background: "rgba(0, 0, 0, 0.7)",
        transform: "translate3d(0, 0, 0)",
      }}
    >
      <div
        className="mx-auto"
        style={{
          width: "100%",
          maxWidth: "640px",
          zIndex: 99999,
        }}
      >
        <div id={ELEMENT_ID}>
          <Script id="imobile-config" strategy="afterInteractive">
            {`
              window.adsbyimobile = window.adsbyimobile || [];
              window.adsbyimobile.push({
                pid: 85395,
                mid: 596504,
                asid: 1945474,
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
    </div>
  );
}
