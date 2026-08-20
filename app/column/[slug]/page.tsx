import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;

  const column = await prisma.column.findUnique({
    where: {
      slug,
    },
    select: {
      title: true,
      excerpt: true,
      image: true,
      isPublished: true,
    },
  });

  if (!column || !column.isPublished) {
    return {
      title: "コラム",
      description: "AI NEWS ジャパンの独自コラム",
    };
  }

  const description =
    column.excerpt ||
    "AI NEWS ジャパンが独自の視点でお届けするコラムです。";

  const metadata: Metadata = {
    title: column.title,
    description,
    alternates: {
      canonical: `/column/${slug}`,
    },
    openGraph: {
      title: column.title,
      description,
      type: "article",
      url: `/column/${slug}`,
      siteName: "AI NEWS ジャパン",
      locale: "ja_JP",
    },
    twitter: {
      card: "summary_large_image",
      title: column.title,
      description,
    },
  };

  if (column.image) {
    metadata.openGraph = {
      ...metadata.openGraph,
      images: [
        {
          url: column.image,
          alt: column.title,
        },
      ],
    };

    metadata.twitter = {
      ...metadata.twitter,
      images: [column.image],
    };
  }

  return metadata;
}

export default async function ColumnDetailPage({
  params,
}: Props) {
  const { slug } = await params;

  const column = await prisma.column.findUnique({
    where: {
      slug,
    },
  });

  if (!column || !column.isPublished) {
    notFound();
  }

  const publishedDate = column.publishedAt
    ? new Date(column.publishedAt).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <main className="min-h-screen bg-[#f8fafc]">

      {/* コラムヘッダー */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-5 pb-10 pt-10 md:pb-14 md:pt-14">

          <Link
            href="/column"
            className="inline-flex items-center text-sm font-bold text-slate-400 transition hover:text-blue-600"
          >
            ← コラム一覧
          </Link>

          <div className="mt-8">

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black tracking-[0.2em] text-blue-600">
                COLUMN
              </span>

              {publishedDate && (
                <span className="text-xs font-bold text-slate-400">
                  {publishedDate}
                </span>
              )}
            </div>

            <h1 className="mt-5 text-3xl font-black leading-[1.35] tracking-tight text-slate-950 md:text-5xl">
              {column.title}
            </h1>

            {column.excerpt && (
              <p className="mt-6 text-base leading-8 text-slate-500 md:text-lg">
                {column.excerpt}
              </p>
            )}

          </div>
        </div>
      </section>

      {/* アイキャッチ */}
      <section className="mx-auto max-w-5xl px-4 pt-6 md:pt-8">

        {column.image ? (
          <div className="overflow-hidden rounded-[2rem] shadow-sm">
            <img
              src={column.image}
              alt={column.title}
              className="max-h-[620px] w-full object-cover"
            />
          </div>
        ) : (
          <div className="relative flex h-56 overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-50 via-white to-slate-100 md:h-80">

            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-100/70 blur-3xl" />

            <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-slate-200/70 blur-3xl" />

            <div className="relative m-auto text-center">
              <div className="text-6xl font-black tracking-tight text-blue-600/80 md:text-7xl">
                AI
              </div>

              <div className="mt-2 text-[10px] font-black tracking-[0.45em] text-slate-400">
                AI NEWS JAPAN
              </div>
            </div>

          </div>
        )}

      </section>

      {/* 本文 */}
      <article className="mx-auto max-w-3xl px-5 py-12 md:py-16">

        <div className="text-[17px] leading-[2.1] text-slate-700 md:text-[19px] md:leading-[2.15]">

          {column.content.replace(/\\n/g, "\n").split("\n").map((line, index) => {
            const trimmed = line.trim();

            if (!trimmed) {
              return <div key={index} className="h-3" />;
            }

            // 画像
            if (trimmed.startsWith("[IMAGE:") && trimmed.endsWith("]")) {
              const imageUrl = trimmed.slice(7, -1).trim();

              return (
                <figure
                  key={index}
                  className="my-10 overflow-hidden rounded-3xl"
                >
                  <img
                    src={imageUrl}
                    alt={column.title}
                    className="mx-auto h-auto w-full object-contain"
                  />
                </figure>
              );
            }

            // 大見出し
            if (trimmed.startsWith("# ")) {
              return (
                <h2
                  key={index}
                  className="mb-6 mt-10 border-l-4 border-blue-600 pl-4 text-2xl font-black leading-tight text-slate-950 md:text-3xl"
                >
                  {trimmed.slice(2)}
                </h2>
              );
            }

            // 小見出し
            if (trimmed.startsWith("## ")) {
              return (
                <h3
                  key={index}
                  className="mb-5 mt-8 text-xl font-black text-slate-950 md:text-2xl"
                >
                  {trimmed.slice(3)}
                </h3>
              );
            }

            // 引用
            if (trimmed.startsWith("> ")) {
              return (
                <blockquote
                  key={index}
                  className="mb-7 rounded-r-xl border-l-4 border-slate-300 bg-slate-50 px-5 py-4 text-base font-medium italic leading-8 text-slate-600 md:text-lg"
                >
                  {trimmed.slice(2)}
                </blockquote>
              );
            }

            // 箇条書き
            if (trimmed.startsWith("- ")) {
              return (
                <div
                  key={index}
                  className="mb-3 flex gap-3 text-[17px] leading-[2.1] md:text-[19px]"
                >
                  <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                  <span>{trimmed.slice(2)}</span>
                </div>
              );
            }

            // 太字 **文字**
            const parts = line.split(/(\*\*.*?\*\*)/g);

            return (
              <p
                key={index}
                className="mb-7"
              >
                {parts.map((part, partIndex) => {
                  if (
                    part.startsWith("**") &&
                    part.endsWith("**")
                  ) {
                    return (
                      <strong
                        key={partIndex}
                        className="font-black text-slate-950"
                      >
                        {part.slice(2, -2)}
                      </strong>
                    );
                  }

                  return <span key={partIndex}>{part}</span>;
                })}
              </p>
            );
          })}

        </div>

        {/* コラムの締め */}
        <div className="mt-14 border-t border-slate-200 pt-10">

          <div className="rounded-[2rem] bg-slate-900 p-7 text-white md:p-9">

            <p className="text-[11px] font-black tracking-[0.3em] text-blue-300">
              AI NEWS JAPAN
            </p>

            <h2 className="mt-3 text-xl font-black md:text-2xl">
              ニュースの、その先へ。
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-300">
              AI NEWS ジャパンでは、ニュースだけでは伝えきれない
              AI・仕事・社会・日々の出来事を、独自の視点でお届けします。
            </p>

            <Link
              href="/column"
              className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-blue-50"
            >
              コラムをもっと読む →
            </Link>

          </div>

        </div>

        {/* 著者プロフィール */}
        <section className="mt-10 border-t border-slate-200 pt-8">
          <div className="flex items-center gap-3">
            <img
  src="/author-profile.jpg"
  alt="AI NEWS ジャパン 著者プロフィール"
  className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
/>

            <div>
              <p className="text-[10px] font-black tracking-[0.2em] text-slate-400">
                ABOUT THE AUTHOR
              </p>
              <p className="mt-1 text-sm font-black text-slate-800">
                AI NEWS ジャパン 編集部
              </p>
            </div>
          </div>

          <div className="mt-4 text-xs leading-6 text-slate-500">
            <p>
              <span className="font-bold text-slate-700">学歴：</span>
              偏差値40以下の高校を卒業。サッカー推薦で大学へ進むも、4年目前で華麗に中退。
            </p>

            <p className="mt-1">
              <span className="font-bold text-slate-700">周囲からの評価：</span>
              家族や周囲から「お前は本当にバカだな」と呆れられ、太鼓判を押され続けてきた半生。
            </p>
          </div>
        </section>

        {/* 戻る */}
        <div className="mt-10 text-center">

          <Link
            href="/column"
            className="text-sm font-bold text-slate-400 transition hover:text-blue-600"
          >
            ← コラム一覧へ戻る
          </Link>

        </div>

      </article>

    </main>
  );
}
