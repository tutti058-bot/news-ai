"use client";

import { useState } from "react";

export default function IMobileMobileOpeningAd() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99997] pointer-events-none md:hidden"
    >
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="広告を閉じる"
        className="pointer-events-auto"
        style={{
          position: "fixed",
          top: "12px",
          right: "12px",
          zIndex: 100000,
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          border: "1px solid #ddd",
          background: "#fff",
          color: "#111",
          fontSize: "30px",
          lineHeight: "38px",
          padding: 0,
        }}
      >
        ×
      </button>

      <iframe
        src="/imobile-opening.html"
        title="i-mobile広告"
        className="pointer-events-auto"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "50px",
          border: 0,
          margin: 0,
          padding: 0,
          background: "transparent",
        }}
      />
    </div>
  );
}
