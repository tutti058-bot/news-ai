const PRIME_VIDEO_URL =
  "https://" +
  "www.amazon.co.jp" +
  "/gp/video/storefront?benefitId=default&tag=ainewsjapan-22";

export default function AmazonPrimeVideoAd() {
  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-lg sm:mt-8">
      <a
        href={PRIME_VIDEO_URL}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        className="block px-5 py-6 transition hover:bg-slate-900 sm:px-8 sm:py-7"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black tracking-[0.2em] text-slate-400">
              SPONSORED
            </p>

            <h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
              Amazon Prime Videoチャンネル
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              映画・ドラマ・アニメなど、観たいチャンネルをチェック。
              無料体験対象のチャンネルもあります。
            </p>
          </div>

          <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950">
            今すぐチェック →
          </span>
        </div>
      </a>

      <div className="border-t border-white/10 px-5 py-3 text-[10px] leading-5 text-slate-400 sm:px-8">
        Amazonのアソシエイトとして、AI NEWSジャパンは適格販売により収入を得ています。
      </div>
    </section>
  );
}
