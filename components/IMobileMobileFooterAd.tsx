"use client";

import { useEffect, useRef } from "react";

const ELEMENT_ID = "im-d92fc425e703499da044614d9e3e31b";
const SCRIPT_SRC = [
  "https:",
  "//",
  "imp-adedge.i-mobile.co.jp",
  "/script/v1/spot.js?20220104",
].join("");

export default function IMobileMobileFooterAd() {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = adRef.current;
    if (!root) return;

    const adsbyimobile = (window as Window & { adsbyimobile?: Record<string, unknown>[] }).adsbyimobile || [];
    (window as Window & { adsbyimobile?: Record<string, unknown>[] }).adsbyimobile = adsbyimobile;

    adsbyimobile.push({
      pid: 85395,
      mid: 596504,
      asid: 1945474,
      type: "banner",
      display: "inline",
      elementid: ELEMENT_ID,
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = SCRIPT_SRC;

    root.appendChild(script);

    return () => {
      root.innerHTML = "";
    };
  }, []);

  return (
    <div
      className="md:hidden"
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
      <div
        style={{
          margin: "auto",
          zIndex: 99999,
        }}
      >
        <div id={ELEMENT_ID} ref={adRef} />
      </div>
    </div>
  );
}
