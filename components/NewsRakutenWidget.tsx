export default function NewsRakutenWidget() {
  return (
    <div className="my-8 flex justify-center overflow-hidden">
      <iframe
        src="/rakuten-news.html"
        title="楽天おすすめ商品"
        className="w-full max-w-[468px] border-0"
        style={{ height: 160 }}
        scrolling="no"
      />
    </div>
  );
}
