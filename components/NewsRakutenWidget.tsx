export default function NewsRakutenWidget() {
  const src =
    "https://static.affiliate.rakuten.co.jp/widget/html/mw_dynamic_view.html" +
    "?rakuten_design=slide" +
    "&rakuten_affiliateId=57306437.624edf72.57306438.8f4aa83f" +
    "&rakuten_items=ctsmatch" +
    "&rakuten_genreId=0" +
    "&rakuten_size=468x160" +
    "&rakuten_target=_blank" +
    "&rakuten_theme=gray" +
    "&rakuten_border=off" +
    "&rakuten_auto_mode=on" +
    "&rakuten_genre_title=off" +
    "&rakuten_recommend=on";

  return (
    <div className="my-8 flex justify-center overflow-hidden">
      <iframe
        src={src}
        title="楽天おすすめ商品"
        width="468"
        height="160"
        style={{ border: 0 }}
        scrolling="no"
      />
    </div>
  );
}
