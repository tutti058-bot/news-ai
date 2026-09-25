"use client";

const ELEMENT_ID = "im-d92fc425e703499da044614d9e3e31b6";

const SCRIPT_SRC =
  "https" +
  "://" +
  "imp-adedge.i-mobile.co.jp" +
  "/script/v1/spot.js?20220104";

export default function IMobileMobileFooterAd() {
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
      <div style={{ margin: "auto", zIndex: 99999 }}>
        <div id={ELEMENT_ID}>
          <script async src={SCRIPT_SRC}></script>
          <script
            dangerouslySetInnerHTML={{
              __html: `(window.adsbyimobile=window.adsbyimobile||[]).push({pid:85395,mid:596504,asid:1945474,type:"banner",display:"inline",elementid:"${ELEMENT_ID}"})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
