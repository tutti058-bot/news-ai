export default function NewsRakutenWidget() {
  return (
    <div className="my-8 flex justify-center overflow-hidden">
      <iframe
        src="/rakuten-news.html"
        title="楽天おすすめ商品"
        width="468"
        height="160"
        style={{ border: 0 }}
        scrolling="no"
      />
    </div>
  );
}
