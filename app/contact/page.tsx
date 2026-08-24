import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description:
    "AI NEWS ジャパンへのお問い合わせ。記事内容の訂正・削除、情報提供、サイトに関するご意見などを受け付けています。",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 md:py-16">

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10 md:p-12">

          <p className="text-xs font-black tracking-[0.25em] text-blue-600">
            AI NEWS JAPAN
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            お問い合わせ
          </h1>

          <p className="mt-5 leading-8 text-slate-600">
            AI NEWS ジャパンへのご意見・ご感想、記事内容に関する
            お問い合わせ、情報提供などを受け付けています。
          </p>

          <div className="mt-10 space-y-8">

            <section>
              <h2 className="text-xl font-black text-slate-900">
                お問い合わせいただける内容
              </h2>

              <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-slate-600">
                <li>記事内容に関するお問い合わせ</li>
                <li>記事内容の訂正・削除に関するご連絡</li>
                <li>情報提供・ニュースに関するご連絡</li>
                <li>サイトに関するご意見・ご感想</li>
                <li>プライバシーに関するお問い合わせ</li>
                <li>その他、当サイトに関するお問い合わせ</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                メールでのお問い合わせ
              </h2>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-bold text-slate-500">
                  メールアドレス
                </p>

                <a
                  href="mailto:tutti058@gmail.com"
                  className="mt-2 inline-block break-all text-lg font-black text-blue-600 hover:text-blue-800"
                >
                  tutti058@gmail.com
                </a>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                記事内容の訂正・削除について
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                掲載内容に誤りがある場合や、訂正・削除が必要と思われる
                情報がございましたら、対象記事のURLと具体的な内容を
                添えてご連絡ください。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                内容を確認したうえで、必要に応じて対応いたします。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                ご連絡について
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                お問い合わせ内容を確認後、必要に応じて返信いたします。
                内容によっては返信までに時間をいただく場合があります。
              </p>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}
