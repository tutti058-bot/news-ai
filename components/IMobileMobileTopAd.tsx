"use client";

import { useState } from "react";
import Script from "next/script";

export default function IMobileMobileTopAd() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[99998] md:hidden"
      style={{
        width: "100%",
        textAlign: "center",
        background: "rgba(0, 0, 0, 0.7)",
      }}
    >
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="広告を閉じる"
        style={{
          position: "absolute",
          right: "4px",
          bottom: "-30px",
          width: "28px",
          height: "28px",
          padding: 0,
          border: "1px solid #777",
          borderRadius: "50%",
          background: "#fff",
          color: "#333",
          fontSize: "20px",
          lineHeight: "24px",
          zIndex: 99999,
        }}
      >
        ×
      </button>

      <div style={{ margin: "auto", width: "100%" }}>
        <div id="im-cc3b982e145d4dcbac373c837bcfb087-top">
          <Script
            src="https://imp-adedge.i-mobile.co.jp/script/v1/spot.js?20220104"
            strategy="afterInteractive"
          />

          <Script id="imobile-mobile-top-config" strategy="afterInteractive">
            {`
              (window.adsbyimobile = window.adsbyimobile || []).push({
                pid: 85395,
                mid: 596063,
                asid: 1946053,
                type: "banner",
                display: "inline",
                elementid: "im-cc3b982e145d4dcbac373c837bcfb087-top"
              });
            `}
          </Script>
        </div>
      </div>
    </div>
  );
}
