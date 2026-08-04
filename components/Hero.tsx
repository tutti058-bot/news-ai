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
    <section className="overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl">

      <div className="grid lg:grid-cols-2">

        <img
          src={top.image ?? "/news.jpg"}
          alt={top.title}
          className="h-64 w-full object-cover sm:h-72 lg:h-full lg:min-h-[460px]"
        />

        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-12">

          <span className="mb-4 inline-flex w-fit rounded-full bg-red-600 px-4 py-2 text-sm font-bold">
            🔥 AI注目ニュース
          </span>

          <h1 className="text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            {top.title}
          </h1>

          <p className="mt-5 line-clamp-3 whitespace-pre-wrap leading-7 text-slate-300">
            {top.summary}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">

  <span className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold">
    {top.category}
  </span>

  <span className="rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-slate-900">
    AI {top.score}点
  </span>

</div>

<Link
  href={`/news/${top.id}`}
  className="mt-8 inline-flex w-fit items-center justify-center rounded-full bg-white px-7 py-3 font-bold text-slate-900 transition hover:bg-blue-600 hover:text-white"
>
  続きを読む →
</Link>

        </div>

      </div>

    </section>
  );
}