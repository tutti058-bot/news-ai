"use client";

import { useEffect, useState } from "react";

type Props = {
  type: "page-match" | "ranking";
  genreId?: string;
};

export default function RakutenWidget({
  type,
  genreId = "0",
}: Props) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth < 768);
    };

    update();
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("resize", update);
    };
  }, []);

  if (isMobile === null) {
    return null;
  }

  const isPageMatch = type === "page-match";

  // PC: 728x200 / スマホ: 320x100
  const size = isMobile ? "320x100" : "728x200";

  return (
    <div className="my-6 flex w-full justify-center overflow-hidden sm:my-8">
      <div className="w-full max-w-[728px] overflow-hidden">
        <div
          dangerouslySetInnerHTML={{
            __html: `
              <script type="text/javascript">
                rakuten_design="slide";
                rakuten_affiliateId="57306437.624edf72.57306438.8f4aa83f";
                rakuten_items="${isPageMatch ? "ctsmatch" : "ranking"}";
                rakuten_genreId="${genreId}";
                rakuten_size="${size}";
                rakuten_target="_blank";
                rakuten_theme="gray";
                rakuten_border="${isPageMatch ? "on" : "off"}";
                rakuten_auto_mode="on";
                rakuten_genre_title="off";
                rakuten_recommend="on";
              </script>
              <script
                type="text/javascript"
                src="https://xml.affiliate.rakuten.co.jp/widget/js/rakuten_widget.js?20230106">
              </script>
            `,
          }}
        />
      </div>
    </div>
  );
}
