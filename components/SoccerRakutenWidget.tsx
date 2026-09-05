"use client";

import { useEffect, useRef } from "react";

export default function SoccerRakutenWidget() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.innerHTML = `
      <script type="text/javascript">
        rakuten_design="slide";
        rakuten_affiliateId="57306437.624edf72.57306438.8f4aa83f";
        rakuten_items="ranking";
        rakuten_genreId="101070";
        rakuten_size="728x200";
        rakuten_target="_blank";
        rakuten_theme="gray";
        rakuten_border="off";
        rakuten_auto_mode="on";
        rakuten_genre_title="off";
        rakuten_recommend="on";
        rakuten_ts="1788607117647";
      </script>
    `;

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "https://xml.affiliate.rakuten.co.jp/widget/js/rakuten_widget.js?20230106";

    el.appendChild(script);

    return () => {
      el.innerHTML = "";
    };
  }, []);

  return (
    <div className="my-8 flex justify-center overflow-hidden">
      <div
        ref={ref}
        className="w-full max-w-[728px]"
      />
    </div>
  );
}
