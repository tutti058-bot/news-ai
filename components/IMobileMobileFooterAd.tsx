"use client";

import { useEffect, useRef } from "react";

const ELEMENT_ID = "im-d92fc425e703499da044614d9e3e31b6";

export default function IMobileMobileFooterAd() {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = adRef.current;
    if (!root) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = ["https:", "//", "imp-adedge.i-mobile.co.jp", "/script/v1/spot.js?20220104"].join("");

    const config = document.createElement("script");
    config.text = `
      (window.adsbyimobile = window.adsbyimobile || []).push({
        pid: 85395,
        mid: 596504,
        asid: 1945474,
        type: "banner",
        display: "inline",
        elementid: "${ELEMENT_ID}"
      });
    `;

    root.appendChild(script);
    root.appendChild(config);

    return () => {
      root.innerHTML = "";
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        background: "rgba(0, 0, 0, 0.7)",
        zIndex: 99998,
        textAlign: "center",
        transform: "translate3d(0, 0, 0)",
      }}
    >
      <div style={{ margin: "auto", zIndex: 99999 }}>
        <div id={ELEMENT_ID} ref={adRef} />
      </div>
    </div>
  );
}
