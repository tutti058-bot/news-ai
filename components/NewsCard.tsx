import Link from "next/link";

type NewsCardProps = {
  id: number;
  title: string;
  summary: string;
  image: string;
  category: string;
  date: string;
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

        <div className="p-5 sm:p-6">

          <h3 className="line-clamp-2 text-xl font-black leading-snug text-slate-900 transition group-hover:text-blue-600 sm:text-2xl">
            {title}
          </h3>

          <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600 sm:text-base">
            {summary}
          </p>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">

            <span className="text-sm text-slate-500">
              📅 {date}
            </span>

            <span className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white transition duration-300 group-hover:bg-slate-900">
              続きを読む →
            </span>

          </div>

        </div>

      </article>
    </Link>
  );
}