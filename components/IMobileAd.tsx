"use client";

import Script from "next/script";

declare global {
  interface Window {
    adsbyimobile?: Array<{
      pid: number;
      mid: number;
      asid: number;
      type: string;
      display: string;
      elementid: string;
    }>;
  }
}

const ELEMENT_ID = "im-e6bbe34fc4c3477981c4545afaeddf53";

export default function IMobileAd() {
  const initializeAd = () => {
    window.adsbyimobile = window.adsbyimobile || [];

    window.adsbyimobile.push({
      pid: 85395,
      mid: 596062,
      asid: 1944289,
      type: "banner",
      display: "inline",
      elementid: ELEMENT_ID,
    });
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
      <div className="flex items-center justify-between px-5 py-3">
        <span className="text-[10px] font-black tracking-[0.2em] text-slate-400">
          ADVERTISEMENT
        </span>
      </div>

      <div id={ELEMENT_ID}>
        <Script
          src="https://imp-adedge.i-mobile.co.jp/script/v1/spot.js?20220104"
          strategy="afterInteractive"
          onLoad={initializeAd}
        />
      </div>
    </div>
  );
}
