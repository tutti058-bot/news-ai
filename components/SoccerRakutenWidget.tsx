export default function SoccerRakutenWidget() {
  return (
    <div className="my-8 flex justify-center overflow-hidden">
      <iframe
        src="/rakuten-soccer.html"
        title="楽天スポーツランキング"
        width="468"
        height="160"
        style={{ border: 0 }}
        scrolling="no"
      />
    </div>
  );
}
