import Link from "next/link";

const categories = [
  "国内",
  "芸能",
  "スポーツ",
  "経済",
  "テクノロジー",
];

export default function Footer() {
  return (
    <footer className="mt-20 bg-slate-900 text-white">

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-3">

        {/* Logo */}

        <div>

          <h2 className="text-4xl font-black">
            NEWS AI
          </h2>

          <p className="mt-4 leading-8 text-slate-300">

            AIが国内ニュースを収集・要約し、
            分かりやすく配信するニュースメディア。

          </p>

        </div>

        {/* Category */}

        <div>

          <h3 className="mb-6 text-xl font-bold">

            カテゴリー

          </h3>

          <div className="space-y-4">

            {categories.map((category) => (

              <Link
                key={category}
                href="#"
                className="block transition hover:text-blue-400"
              >
                {category}
              </Link>

            ))}

          </div>

        </div>

        {/* Contact */}

        <div>

          <h3 className="mb-6 text-xl font-bold">

            NEWS AI

          </h3>

          <p className="leading-8 text-slate-300">

            AI × RSS × OpenAI × n8n

            <br />

            最新ニュースを24時間自動配信。

          </p>

        </div>

      </div>

      <div className="border-t border-slate-800 py-6 text-center text-sm text-slate-400">

        © 2026 NEWS AI. All Rights Reserved.

      </div>

    </footer>
  );
}