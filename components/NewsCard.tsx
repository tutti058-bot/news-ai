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
      <article className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
        <div className="relative overflow-hidden">
          <img
            src={image}
            alt={title}
            className="h-64 w-full object-cover transition duration-500 group-hover:scale-110"
          />

          <div className="absolute left-5 top-5">
            <span
              className={`rounded-full px-4 py-2 text-xs font-bold text-white ${
                categoryColor[category] ?? "bg-slate-700"
              }`}
            >
              {category}
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              AI要約
            </span>

            <span className="text-sm font-medium text-slate-500">
              {date}
            </span>
          </div>

          <h3 className="line-clamp-2 text-2xl font-bold leading-snug text-slate-900 transition group-hover:text-blue-600">
            {title}
          </h3>

          <p className="mt-4 line-clamp-3 leading-7 text-slate-700">
            {summary}
          </p>

          <div className="mt-8 flex items-center justify-between">
            <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-blue-600">
              続きを読む
            </button>

            <button className="flex items-center gap-2 text-sm font-bold text-blue-600 transition duration-300 group-hover:translate-x-1">
              詳しく見る

              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
}