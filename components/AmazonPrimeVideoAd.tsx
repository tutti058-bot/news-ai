const PRIME_VIDEO_URL =
  "https://www.amazon.co.jp/gp/video/storefront?benefitId=default&tag=ainewsjapan-22";

export default function AmazonPrimeVideoAd() {
  return (
    <section className="mt-5 w-full">
      <div className="mx-auto w-full max-w-[728px]">
        <a
          href={PRIME_VIDEO_URL}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          aria-label="Amazon Prime Videoチャンネルをチェック"
          className="block overflow-hidden rounded-md transition-opacity hover:opacity-90"
        >
          <img
            src="/amazon-prime-video-banner.jpg"
            alt="Amazon Prime Videoチャンネル とことん、観たいチャンネルだけ"
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
