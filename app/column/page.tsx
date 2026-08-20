import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "コラム",
  description:
    "AI NEWS ジャパン独自の視点で、AI・仕事・社会・日々の出来事についてお届けするコラムです。",
  alternates: {
    canonical: "/column",
  },
  openGraph: {
    title: "コラム | AI NEWS ジャパン",
    description:
      "AI NEWS ジャパン独自の視点でお届けするコラムです。",
    url: "/column",
    siteName: "AI NEWS ジャパン",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "コラム | AI NEWS ジャパン",
    description:
      "AI NEWS ジャパン独自の視点でお届けするコラムです。",
  },
};

type Column = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  image: string | null;
  publishedAt: string | null;
};

async function getColumns(): Promise<Column[]> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/column`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();

    return (data.columns ?? []).filter(
      (column: Column) => column.publishedAt
    );
  } catch {
    return [];
  }
}

function formatDate(date: string | null) {
  if (!date) return "";

  return new Date(date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ColumnImage({
  column,
  large = false,
}: {
  column: Column;
  large?: boolean;
}) {
  if (column.image) {
    return (
      <img
        src={column.image}
        alt={column.title}
        className={`w-full object-cover transition duration-500 group-hover:scale-105 ${
          large ? "h-[300px] md:h-[390px]" : "h-56"
        }`}
      />
    );
  }

  return (
    <div
      className={`relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-100 ${
        large ? "h-[320px] md:h-[400px]" : "h-56"
      }`}
    >
      <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-slate-200/70 blur-3xl" />

      <div className="relative text-center">
        <div className="text-5xl font-black text-blue-600/80">
          AI
        </div>
        <div className="mt-1 text-xs font-black tracking-[0.3em] text-slate-400">
          COLUMN
        </div>
      </div>
    </div>
  );
}

export default async function ColumnPage() {
  const columns = await getColumns();

  const featured = columns[0];
  const secondary = columns.slice(1, 3);
  const rest = columns.slice(3);

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ヒーロー */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 md:py-20">

          <p className="text-sm font-black tracking-[0.25em] text-blue-600">
            AI NEWS JAPAN
          </p>

          <div className="mt-4 max-w-3xl">
            <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
              ニュースでは、語れない話。
            </h1>

            <p className="mt-5 text-base leading-8 text-slate-500 md:text-lg">
              AI、仕事、人生、日々の出来事。
              <br className="hidden md:block" />
              ニュースだけでは伝わらない、
              <br className="hidden md:block" />
              そんな話を、自分の言葉で綴ります。
            </p>
          </div>

        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">

        {columns.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
            <div className="text-4xl">📝</div>
            <p className="mt-4 font-bold text-slate-500">
              公開されているコラムはありません。
            </p>
          </div>
        ) : (
          <>
            {/* FEATURED */}
            {featured && (
              <section>
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black tracking-[0.2em] text-blue-600">
                      FEATURED
                    </p>

                    <h2 className="mt-1 text-2xl font-black text-slate-900">
                      最新コラム
                    </h2>
                  </div>
                </div>

                <Link
                  href={`/column/${featured.slug}`}
                  className="group block overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="overflow-hidden">

                    <div className="overflow-hidden">
                      <ColumnImage
                        column={featured}
                        large
                      />
                    </div>

                    <div className="flex flex-col justify-center p-7 md:p-10 lg:p-12">

                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">
                          COLUMN
                        </span>

                        <span className="text-xs font-bold text-slate-400">
                          {formatDate(featured.publishedAt)}
                        </span>
                      </div>

                      <h2 className="mt-5 text-2xl font-black leading-relaxed text-slate-950 transition group-hover:text-blue-600 md:text-3xl">
                        {featured.title}
                      </h2>

                      {featured.excerpt && (
                        <p className="mt-5 line-clamp-4 text-sm leading-8 text-slate-500 md:text-base">
                          {featured.excerpt}
                        </p>
                      )}

                      <div className="mt-7 font-black text-blue-600">
                        続きを読む
                        <span className="ml-2 transition group-hover:ml-3">
                          →
                        </span>
                      </div>

                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* SECONDARY */}
            {secondary.length > 0 && (
              <section className="mt-10">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                  {secondary.map((column) => (
                    <Link
                      key={column.id}
                      href={`/column/${column.slug}`}
                      className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="overflow-hidden">
                        <ColumnImage column={column} />
                      </div>

                      <div className="p-6">

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black tracking-widest text-blue-600">
                            COLUMN
                          </span>

                          <span className="text-xs text-slate-400">
                            {formatDate(column.publishedAt)}
                          </span>
                        </div>

                        <h2 className="mt-3 line-clamp-2 text-xl font-black leading-relaxed text-slate-900 group-hover:text-blue-600">
                          {column.title}
                        </h2>

                        {column.excerpt && (
                          <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-500">
                            {column.excerpt}
                          </p>
                        )}

                        <div className="mt-5 text-sm font-black text-blue-600">
                          読む →
                        </div>

                      </div>
                    </Link>
                  ))}

                </div>
              </section>
            )}

            {/* MORE */}
            {rest.length > 0 && (
              <section className="mt-14">

                <div className="mb-6 flex items-end justify-between">
                  <div>
                    <p className="text-xs font-black tracking-[0.2em] text-blue-600">
                      ALL COLUMNS
                    </p>

                    <h2 className="mt-1 text-2xl font-black text-slate-900">
                      すべてのコラム
                    </h2>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                  {rest.map((column) => (
                    <Link
                      key={column.id}
                      href={`/column/${column.slug}`}
                      className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="overflow-hidden">
                        <ColumnImage column={column} />
                      </div>

                      <div className="p-6">

                        <p className="text-xs font-black tracking-widest text-blue-600">
                          COLUMN
                        </p>

                        <h2 className="mt-3 line-clamp-2 text-lg font-black leading-relaxed text-slate-900 group-hover:text-blue-600">
                          {column.title}
                        </h2>

                        {column.excerpt && (
                          <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-500">
                            {column.excerpt}
                          </p>
                        )}

                        <p className="mt-5 text-xs font-bold text-slate-400">
                          {formatDate(column.publishedAt)}
                        </p>

                      </div>
                    </Link>
                  ))}

                </div>
              </section>
            )}
          </>
        )}

      </div>
    </main>
  );
}