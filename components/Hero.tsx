import { prisma } from "@/lib/prisma";
import Link from "next/link";

function cleanText(text: string) {
  return text
    .replace(/&#45;/gi, "-")
    .replace(/&#x2d;/gi, "-")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

export default async function Hero() {
  const top = await prisma.news.findFirst({
    orderBy: {
      publishedAt: "desc",
    },
  });

  if (!top) return null;

  const title = cleanText(top.title);
const summary = cleanText(top.summary ?? "");

  return (
    <section className="w-full overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl">
      <div className="grid min-w-0 lg:grid-cols-2">

        {/* Image */}
        <div className="min-w-0">
          <img
            src={top.image ?? "/news.jpg"}
            alt={title}
            className="block aspect-[16/9] w-full object-cover sm:aspect-auto sm:h-72 lg:h-full lg:min-h-[460px]"
          />
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-col justify-center p-5 sm:p-8 lg:p-12">

          {/* Badge */}
          <span className="mb-4 inline-flex w-fit max-w-full rounded-full bg-red-600 px-4 py-2 text-sm font-bold">
            🔥 AI注目ニュース
          </span>

          {/* Title */}
          <h1 className="max-w-full break-words text-[28px] font-black leading-[1.25] tracking-tight [overflow-wrap:anywhere] sm:text-4xl lg:text-5xl">
            {title}
          </h1>

          {/* Summary */}
          <p className="mt-4 line-clamp-3 max-w-full break-words text-[15px] leading-7 text-slate-300 [overflow-wrap:anywhere] sm:mt-5 sm:text-base sm:leading-7">
            {summary}
          </p>

          {/* Scores */}
          <div className="mt-5 flex flex-wrap gap-2">

            <span className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold">
              {top.category}
            </span>

            <span className="rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-slate-900">
              AI {top.score}点
            </span>

          </div>

          {/* Button */}
          <Link
            href={`/news/${top.id}`}
            className="mt-6 inline-flex w-fit items-center justify-center rounded-full bg-white px-6 py-3 font-bold text-slate-900 transition hover:bg-blue-600 hover:text-white sm:mt-8 sm:px-7"
          >
            続きを読む →
          </Link>

        </div>
      </div>
    </section>
  );
}