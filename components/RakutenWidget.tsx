type Props = {
  type: "page-match" | "ranking";
  genreId?: string;
};

export default function RakutenWidget({
  type,
  genreId = "0",
}: Props) {
  return (
    <div className="my-8 flex justify-center overflow-hidden">
      <iframe
        src={
          type === "page-match"
            ? `/rakuten-page-match.html?genreId=${encodeURIComponent(genreId)}`
            : `/rakuten-ranking.html?genreId=${encodeURIComponent(genreId)}`
        }
        title={type === "page-match" ? "楽天ページマッチ" : "楽天ランキング"}
        className="w-full max-w-[728px] border-0"
        style={{ height: 200 }}
        scrolling="no"
      />
    </div>
  );
}
