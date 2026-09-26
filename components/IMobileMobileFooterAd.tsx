"use client";

export default function IMobileMobileFooterAd() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[99998] md:hidden">
      <iframe
        src="/imobile-test.html"
        title="i-mobile広告"
        style={{
          display: "block",
          width: "100vw",
          height: "50px",
          border: "0",
          margin: "0 auto",
          background: "transparent",
        }}
      />
    </div>
  );
}
