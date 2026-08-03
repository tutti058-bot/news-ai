import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function Hero() {
  const top = await prisma.news.findFirst({
    orderBy: {
      score: "desc",
    },
  });

  if (!top) return null;

  return (
    <section className="overflow-hidden rounded-3xl bg-slate-900 text-white">
      <div className="grid lg:grid-cols-2">
        <img
          src={top.image ?? "/news.jpg"}
          alt={top.title}
          className="h-full min-h-[420px] w-full object-cover"
        />

        <div className="flex flex-col justify-center p-10">
          <span className="mb-4 inline-block rounded-full bg-red-600 px-4 py-2 text-sm font-bold">
            🔥 AI注目ニュース
          </span>

          <h1 className="text-5xl font-black leading-tight">
            {top.title}
          </h1>

          <p className="mt-6 whitespace-pre-wrap leading-8 text-slate-300">
            {top.summary}
          </p>

          <div className="mt-8 flex items-center gap-4">
            <span className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold">
              {top.category}
            </span>

            <span className="rounded-full bg-amber-500 px-4 py-2 text-sm font-bold">
              AI {top.score}点
            </span>
          </div>

          <Link
            href={`/news/${top.id}`}
            className="mt-10 inline-flex w-fit rounded-full bg-white px-8 py-4 font-bold text-slate-900 transition hover:bg-blue-600 hover:text-white"
          >
            続きを読む →
          </Link>
        </div>
      </div>
    </section>
  );
}