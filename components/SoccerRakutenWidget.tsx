export default function SoccerRakutenWidget() {
  return (
    <div className="my-8 flex justify-center overflow-hidden">
      <iframe
        src="/rakuten-soccer.html"
        title="楽天スポーツランキング"
        className="w-full max-w-[468px] border-0"
        style={{ height: 160 }}
        scrolling="no"
      />
    </div>
  );
}
