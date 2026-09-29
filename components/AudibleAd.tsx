const AUDIBLE_URL =
  "https://www.amazon.co.jp/b/ref=adbl_JP_as_0068?ie=UTF8&node=5816607051&tag=ainewsjapan-22";

export default function AudibleAd() {
  return (
    <section className="mt-5 w-full">
      <div className="mx-auto w-full max-w-[728px]">
        <a
          href={AUDIBLE_URL}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          aria-label="Audibleをチェック"
          className="block overflow-hidden rounded-md transition-opacity hover:opacity-90"
        >
          <img
            src="/audible-banner.jpg"
            alt="Audible 本は、聴こう。無料TRY!"
            width={728}
            height={90}
            className="block h-auto w-full"
          />
        </a>

        <p className="mt-2 text-right text-[10px] leading-4 text-slate-400">
          Amazonのアソシエイトとして、AI NEWSジャパンは適格販売により収入を得ています。
        </p>
      </div>
    </section>
  );
}
