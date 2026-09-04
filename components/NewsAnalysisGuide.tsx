export default function NewsAnalysisGuide() {
  return (
    <section className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm sm:p-8">
      <div className="mb-5">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
          HOW WE ANALYZE
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
          AI NEWSジャパンのニュース分析
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
          AI NEWSジャパンでは、ニュースをただ掲載するのではなく、
          AIによる要約と独自の評価を組み合わせ、ニュースの重要なポイントを分かりやすく整理しています。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["重要度", "ニュースとしての重要性", "bg-red-500", "text-red-600"],
          ["話題性", "注目を集める可能性", "bg-orange-500", "text-orange-600"],
          ["影響度", "社会や業界への影響", "bg-blue-500", "text-blue-600"],
          ["新規性", "新しい情報や動き", "bg-purple-500", "text-purple-600"],
          ["注目度", "読者が知る価値", "bg-green-500", "text-green-600"],
        ].map(([title, text, barColor, titleColor]) => (
          <div
            key={title}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className={`h-2 w-full ${barColor}`} />

            <div className="p-4">
              <p className={`font-black ${titleColor}`}>{title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {text}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 p-4">
          <p className="font-black text-slate-900">AI要約</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            元記事の内容をもとに、ニュースの要点を短く整理しています。
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 p-4">
          <p className="font-black text-slate-900">やんすAIの補足</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            記事ごとの背景や、特に注目したいポイントを補足しています。
          </p>
        </div>
      </div>
    </section>
  );
}
