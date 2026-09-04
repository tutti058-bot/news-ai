import Link from "next/link";

type NewsCardProps = {
  id: number;
  title: string;
  summary: string;
  image: string;
  category: string;
  date: string;
  score: number;
};

const categoryColor: Record<string, string> = {
  国内: "bg-red-600",
  芸能: "bg-pink-500",
  スポーツ: "bg-green-600",
  経済: "bg-blue-600",
  テクノロジー: "bg-violet-600",
};

export default function NewsCard({
  id,
  title,
  summary,
  image,
  category,
  date,
  score,
}: NewsCardProps) {
  return (
    <Link href={`/news/${id}`}>
      <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">

        <div className="relative">

          <img
            src={image}
            alt={title}
            className="aspect-video w-full object-cover transition duration-500 group-hover:scale-105"
          />

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold text-white ${
                categoryColor[category] ?? "bg-slate-700"
              }`}
            >
              {category}
            </span>

            <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
              AI要約
            </span>

          </div>

        </div>

        <div className="p-3 sm:p-4 lg:p-6">

          <h3 className="line-clamp-3 text-base font-black leading-snug text-slate-900 transition group-hover:text-blue-600 sm:line-clamp-2 sm:text-lg lg:text-2xl">
            {title}
          </h3>

          <p className="mt-2 hidden line-clamp-2 text-xs leading-5 text-slate-600 sm:mt-3 sm:block sm:text-sm sm:leading-6 lg:text-base lg:leading-7">
            {summary}
          </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 sm:mt-4 sm:pt-4">

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 sm:text-sm">
                📅 {date}
              </span>

              <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-500 sm:px-3 sm:text-sm">
                AI {score}点
              </span>
            </div>

            <span className="rounded-full bg-blue-600 px-2.5 py-1.5 text-[10px] font-bold text-white transition duration-300 group-hover:bg-slate-900 sm:px-4 sm:py-2 sm:text-sm">
              続きを読む →
            </span>

          </div>

        </div>

      </article>
    </Link>
  );
}