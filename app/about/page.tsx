import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "運営者情報",
  description:
    "AI NEWS ジャパンの運営者情報、サイト概要、編集方針、AIの利用についてご案内します。",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 md:py-16">

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10 md:p-12">

          <p className="text-xs font-black tracking-[0.25em] text-blue-600">
            AI NEWS JAPAN
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            運営者情報
          </h1>

          <div className="mt-10 space-y-10">

            <section>
              <h2 className="text-xl font-black text-slate-900">
                サイト名
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                AI NEWS ジャパン
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                サイト概要
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                AI NEWS ジャパンは、国内外で報じられているニュースを
                わかりやすく整理し、短時間でニュースの概要を把握できる
                情報メディアを目指して運営しています。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                国内ニュース、テクノロジー、AI、スポーツ、芸能、経済、
                国際など、日々のニュースを幅広く取り扱っています。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                情報収集・編集について
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                ニュース記事の作成では、公開されているニュースサイトや
                RSSなどの情報をもとに、記事の概要を整理しています。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                情報源となる記事へのリンクを掲載し、読者が元の情報を
                確認できるようにしています。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                ニュースの内容によっては情報が更新される場合があるため、
                重要な情報については複数の情報源を確認することを
                心がけています。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                AIの利用について
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                AI NEWS ジャパンでは、ニュース情報の整理や要約、
                記事作成の補助などにAI技術を活用しています。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                AIによる生成結果をそのまま情報として扱うのではなく、
                ニュースの内容や情報源を確認したうえで掲載することを
                基本方針としています。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                コラムについて
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                コラムでは、通常のニュース記事とは異なり、
                AI・仕事・社会・人生・日々の出来事などについて、
                ニュースだけでは伝えきれないテーマを独自の視点で
                掘り下げています。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                ニュースの要約だけではなく、読者がテーマについて
                考えたり、別の視点を得たりできる読み物を目指しています。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                情報の正確性について
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                掲載情報については可能な限り正確な内容を掲載するよう
                努めていますが、ニュースの性質上、掲載後に内容が
                更新・訂正される場合があります。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                最終的な判断や重要な意思決定に利用する場合は、
                必ず掲載元の情報や公的機関などの一次情報をご確認ください。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                お問い合わせ
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                サイトに関するお問い合わせ、記事内容に関するご連絡、
                情報の訂正・削除に関するご連絡は、
                お問い合わせページよりお願いいたします。
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
