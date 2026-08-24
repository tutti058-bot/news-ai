import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約",
  description:
    "AI NEWS ジャパンの利用規約、情報の取り扱い、著作権、広告・アフィリエイト、免責事項についてご案内します。",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 md:py-16">

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10 md:p-12">

          <p className="text-xs font-black tracking-[0.25em] text-blue-600">
            AI NEWS JAPAN
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            利用規約
          </h1>

          <p className="mt-5 leading-8 text-slate-600">
            AI NEWS ジャパンをご利用いただきありがとうございます。
            本サイトをご利用いただく際は、以下の内容をご確認ください。
          </p>

          <div className="mt-10 space-y-10">

            <section>
              <h2 className="text-xl font-black text-slate-900">
                サイトについて
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                AI NEWS ジャパンは、国内外のニュースを整理・要約し、
                読者がニュースの概要を把握しやすい形で提供する情報メディアです。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                情報の正確性・最新性について
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                当サイトでは、掲載する情報の正確性・最新性の確保に努めていますが、
                すべての情報について正確性、完全性、最新性を保証するものではありません。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                ニュース記事は掲載後に内容が更新・訂正される場合があります。
                重要な情報については、記事内に掲載している情報源や
                公的機関などの一次情報をご確認ください。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                AIを利用したコンテンツについて
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                当サイトでは、ニュース情報の整理、要約、記事作成の補助などに
                AI技術を利用しています。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                AIによる生成結果には誤りが含まれる可能性があります。
                当サイトでは情報源の確認などを行い、可能な限り正確な情報を
                提供するよう努めていますが、内容を完全に保証するものではありません。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                外部リンクについて
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                当サイトには、ニュースの情報源や関連サービスなど、
                外部サイトへのリンクが含まれる場合があります。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                外部サイトの内容、サービス、個人情報の取り扱いなどについては、
                当サイトでは責任を負いません。各サイトの利用規約や
                プライバシーポリシーをご確認ください。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                広告・アフィリエイトについて
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                当サイトでは、広告サービスやアフィリエイトプログラムを
                利用している場合があります。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                広告・アフィリエイトによって発生する収益は、
                サイトの運営やコンテンツの制作・改善などに利用しています。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                掲載しているサービスについて、当サイトがその品質や
                利用結果を保証するものではありません。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                著作権について
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                当サイトに掲載している文章、画像、ロゴ、その他のコンテンツの
                著作権・その他の権利は、当サイトまたは各権利者に帰属します。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                権利者の許可なく、当サイトのコンテンツを無断で転載、
                複製、改変、販売することを禁止します。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                禁止事項
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                当サイトの利用にあたり、以下の行為を禁止します。
              </p>

              <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-slate-600">
                <li>法令または公序良俗に反する行為</li>
                <li>当サイトの運営を妨害する行為</li>
                <li>当サイトの情報を不正な目的で利用する行為</li>
                <li>第三者または当サイトに不利益・損害を与える行為</li>
                <li>その他、運営者が不適切と判断する行為</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                免責事項
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                当サイトの利用により利用者に生じた損害について、
                運営者に故意または重大な過失がある場合を除き、
                当サイトは責任を負いません。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                また、システム障害、通信障害、外部サービスの停止など、
                当サイトの管理が及ばない事由によって発生した損害についても、
                責任を負いかねます。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                規約の変更
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                本規約は、必要に応じて変更する場合があります。
                変更後の利用規約は、当サイトに掲載した時点から
                適用されるものとします。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                お問い合わせ
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                本規約に関するお問い合わせは、お問い合わせページより
                ご連絡ください。
              </p>

              <div className="mt-5">
                <a
                  href="/contact"
                  className="inline-flex rounded-full bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                >
                  お問い合わせページへ →
                </a>
              </div>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}
