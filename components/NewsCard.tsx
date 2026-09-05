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
    <Link href={`/news/${id}`} className="block h-full">
      <article className="group flex h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg lg:flex-col lg:rounded-3xl lg:shadow-md">

        {/* 画像 */}
        <div className="relative h-28 w-32 shrink-0 sm:h-32 sm:w-40 lg:h-auto lg:w-full lg:shrink">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105 lg:aspect-video"
          />

          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5 lg:left-3 lg:top-3 lg:gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold text-white lg:px-3 lg:py-1 lg:text-xs ${
                categoryColor[category] ?? "bg-slate-700"
              }`}
            >
              {category}
            </span>

            <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white lg:px-3 lg:py-1 lg:text-xs">
              AI要約
            </span>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4 lg:p-6">

          <h3 className="line-clamp-3 text-sm font-black leading-5 text-slate-900 transition group-hover:text-blue-600 sm:text-base sm:leading-6 lg:min-h-[4.5rem] lg:line-clamp-2 lg:text-2xl lg:leading-snug">
            {title}
          </h3>

          {/* PCのみ概要 */}
          <p className="mt-3 hidden line-clamp-2 text-sm leading-6 text-slate-600 lg:block lg:min-h-[3.5rem] lg:text-base lg:leading-7">
            {summary}
          </p>

          {/* 下部情報 */}
          <div className="mt-auto flex items-center justify-between gap-2 pt-3 lg:border-t lg:border-slate-100 lg:pt-4">

            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[10px] text-slate-500 sm:text-xs lg:text-sm">
                📅 {date}
              </span>

              <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-500 sm:text-xs lg:px-3 lg:text-sm">
                AI {score}点
              </span>
            </div>

            <span className="shrink-0 rounded-full bg-blue-600 px-2.5 py-1.5 text-[9px] font-bold text-white transition duration-300 group-hover:bg-slate-900 sm:text-[10px] lg:px-4 lg:py-2 lg:text-sm">
              続きを読む →
            </span>

          </div>

        </div>
      </article>
    </Link>
  );
}
