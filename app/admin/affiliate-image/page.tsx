import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AffiliateImagePage() {
  const programs =
    await prisma.affiliateProgram.findMany({
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">

        <div className="mb-8">
          <Link
            href="/admin"
            className="text-sm font-bold text-blue-600"
          >
            ← 管理画面に戻る
          </Link>

          <h1 className="mt-4 text-3xl font-black text-slate-900">
            アフィリエイトバナー管理
          </h1>

          <p className="mt-3 leading-7 text-slate-500">
            A8の広告コードをそのまま貼り付けてください。
            システムがバナー画像URLを自動で取得します。
          </p>
        </div>

        <div className="space-y-6">

          {programs.map((program) => (
            <section
              key={program.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg"
            >

              <div className="mb-5">
                <div className="flex flex-wrap items-center gap-3">

                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                    ID {program.id}
                  </span>

                  {program.category && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                      {program.category}
                    </span>
                  )}

                </div>

                <h2 className="mt-3 text-2xl font-black text-slate-900">
                  {program.name}
                </h2>
              </div>

              {program.imageUrl && (
                <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                  <p className="mb-3 text-sm font-bold text-slate-500">
                    現在のバナー
                  </p>

                  <img
                    src={program.imageUrl}
                    alt={program.name}
                    className="max-h-48 max-w-full rounded-xl object-contain"
                  />

                </div>
              )}

              <form
                action="/api/affiliate/image"
                method="POST"
                className="space-y-4"
              >

                <input
                  type="hidden"
                  name="id"
                  value={program.id}
                />

                <div>

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    A8広告コード
                  </label>

                  <textarea
                    name="imageUrl"
                    defaultValue=""
                    placeholder={`A8でコピーした広告コードをそのまま貼り付けてください。

例：
<a href="https://px.a8.net/..."
target="_blank">
<img border="0" width="300" height="250"
src="https://example.com/banner.jpg">
</a>`}
                    rows={8}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

                <button
                  type="submit"
                  className="rounded-2xl bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-700"
                >
                  バナーを登録する
                </button>

              </form>

            </section>
          ))}

        </div>

      </div>
    </main>
  );
}
