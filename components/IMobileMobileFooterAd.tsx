"use client";

import Script from "next/script";

const ELEMENT_ID = "im-abb61e4cad7243f1922c7d1619ea129c";

type IMobileConfig = {
  pid: number;
  mid: number;
  asid: number;
  type: string;
  display: string;
  elementid: string;
};

export default function IMobileMobileFooterAd() {
  const initializeAd = () => {
    const imobileWindow = window as Window & {
      adsbyimobile?: IMobileConfig[];
    };

    imobileWindow.adsbyimobile = imobileWindow.adsbyimobile || [];
    imobileWindow.adsbyimobile.push({
      pid: 85395,
      mid: 596504,
      asid: 1945474,
      type: "banner",
      display: "inline",
      elementid: ELEMENT_ID,
    });
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[99998] bg-black/70 text-center md:hidden"
      style={{ transform: "translate3d(0, 0, 0)" }}
    >
      <div className="mx-auto w-full max-w-[640px]" style={{ zIndex: 99999 }}>
        <div id={ELEMENT_ID} className="min-h-[50px]">
          <Script
            src="https://imp-adedge.i-mobile.co.jp/script/v1/spot.js?20220104"
            strategy="afterInteractive"
            onLoad={initializeAd}
          />
        </div>
      </div>
    </div>
  );
}
