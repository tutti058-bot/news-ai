import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "AI NEWS ジャパンのプライバシーポリシー、広告配信、Cookie、アクセス解析、個人情報の取り扱いについてご案内します。",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 md:py-16">

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10 md:p-12">

          <p className="text-xs font-black tracking-[0.25em] text-blue-600">
            AI NEWS JAPAN
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            プライバシーポリシー
          </h1>

          <div className="mt-10 space-y-10">

            <section>
              <h2 className="text-xl font-black text-slate-900">
                基本方針
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                AI NEWS ジャパン（以下「当サイト」）では、
                利用者のプライバシーを尊重し、個人情報の適切な取り扱いと
                保護に努めます。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                個人情報の利用目的
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                当サイトでは、お問い合わせなどを通じて利用者から提供された
                情報を、以下の目的で利用します。
              </p>

              <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-slate-600">
                <li>お問い合わせへの対応</li>
                <li>サービスの提供・改善</li>
                <li>必要な連絡や情報提供</li>
                <li>サイト運営上必要な対応</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                広告について
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                当サイトでは、第三者配信の広告サービスを利用する場合があります。
                広告配信事業者は、利用者の興味や関心に応じた広告を表示するため、
                Cookieなどの技術を利用する場合があります。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                当サイトでは、Google AdSenseなどの広告サービスを利用する場合があります。
                Googleなどの第三者広告配信事業者は、Cookieを使用して、
                利用者の過去のアクセス情報などをもとに広告を配信する場合があります。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                利用者はブラウザの設定からCookieを無効にすることができます。
                ただし、Cookieを無効にした場合、一部のサイト機能が正常に
                利用できない場合があります。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                Cookieについて
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                当サイトでは、利用者の利便性向上、アクセス状況の分析、
                広告配信などの目的でCookieを利用する場合があります。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                Cookieによって取得される情報には、氏名、住所、電話番号、
                メールアドレスなど、個人を直接特定する情報は含まれません。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                アクセス解析について
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                当サイトでは、サイトの利用状況を把握し、コンテンツや
                サービスを改善するためにアクセス解析ツールを利用する場合があります。
              </p>

              <p className="mt-3 leading-8 text-slate-600">
                アクセス解析ツールでは、Cookieなどを利用してアクセス情報を
                収集する場合があります。収集された情報は、サイトの改善や
                利用状況の分析などに利用します。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                個人情報の第三者提供
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                当サイトでは、法令に基づく場合を除き、利用者本人の同意なく
                個人情報を第三者へ提供することはありません。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                個人情報の管理
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                当サイトでは、取得した個人情報について適切に管理し、
                不正アクセス、紛失、漏えいなどの防止に努めます。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                情報の開示・訂正・削除
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                利用者本人から、自身の個人情報について開示、訂正、削除等の
                申し出があった場合は、本人確認を行ったうえで、合理的な範囲で対応します。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                プライバシーポリシーの変更
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                当サイトでは、法令の変更やサイト運営内容の変更などに応じて、
                本プライバシーポリシーを変更する場合があります。
                変更後のプライバシーポリシーは、当サイトに掲載した時点から
                適用されるものとします。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">
                お問い合わせ
              </h2>

              <p className="mt-3 leading-8 text-slate-600">
                プライバシーポリシーや個人情報の取り扱いに関するお問い合わせは、
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
