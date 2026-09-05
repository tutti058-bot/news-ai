type Props = {
  type: "page-match" | "ranking";
};

export default function RakutenWidget({ type }: Props) {
  const isPageMatch = type === "page-match";

  return (
    <div className="my-8 flex justify-center overflow-hidden">
      <div className="w-full max-w-[728px] min-h-[200px]">
        <div
          dangerouslySetInnerHTML={{
            __html: `
              <script type="text/javascript">
                rakuten_design="slide";
                rakuten_affiliateId="57306437.624edf72.57306438.8f4aa83f";
                rakuten_items="${isPageMatch ? "ctsmatch" : "ranking"}";
                rakuten_genreId="0";
                rakuten_size="728x200";
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
