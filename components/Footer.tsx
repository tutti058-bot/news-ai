import Link from "next/link";

const categories = [
  "国内",
  "国際",
  "経済",
  "スポーツ",
  "芸能",
  "テクノロジー",
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-950 text-white">

      <div className="mx-auto max-w-7xl px-5 py-12">

        <div className="grid gap-10 md:grid-cols-3">

          {/* Logo */}

          <div>

            <h2 className="text-3xl font-black">
              AI News ジャパン
            </h2>

            <p className="mt-4 leading-7 text-slate-400">
              AIが最新ニュースを収集・要約し、
              分かりやすく配信するニュースメディアです。
            </p>

          </div>

          {/* Category */}

          <div>

            <h3 className="mb-5 text-lg font-bold">
              カテゴリー
            </h3>

            <div className="grid grid-cols-2 gap-3">

              {categories.map((category) => (

                <Link
                  key={category}
                  href={`/search?q=${encodeURIComponent(category)}`}
                  className="text-slate-400 transition hover:text-white"
                >
                  {category}
                </Link>

              ))}

            </div>

          </div>

          {/* Menu */}

          <div>

            <h3 className="mb-5 text-lg font-bold">
              AI News ジャパン
            </h3>

            <div className="space-y-3">

              <Link
                href="/"
                className="block text-slate-400 transition hover:text-white"
              >
                ホーム
              </Link>

              <Link
                href="/search"
                className="block text-slate-400 transition hover:text-white"
              >
                ニュース検索
              </Link>

              <Link
                href="/about"
                className="block text-slate-400 transition hover:text-white"
              >
                運営者情報
              </Link>

              <Link
                href="/contact"
                className="block text-slate-400 transition hover:text-white"
              >
                お問い合わせ
              </Link>

              <Link
                href="/privacy"
                className="block text-slate-400 transition hover:text-white"
              >
                プライバシーポリシー
              </Link>

              <Link
                href="/terms"
                className="block text-slate-400 transition hover:text-white"
              >
                利用規約
              </Link>

            </div>

          </div>

        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-sm text-slate-500">

          © 2026 AI News ジャパン. All Rights Reserved.

        </div>

      </div>

    </footer>
  );
}