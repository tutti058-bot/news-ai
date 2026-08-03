const ranking = [
  {
    title: "大谷翔平が今季31号ホームラン",
    time: "5分前",
  },
  {
    title: "日経平均株価が大幅上昇",
    time: "15分前",
  },
  {
    title: "台風7号 関東接近",
    time: "30分前",
  },
  {
    title: "OpenAI 新AIモデル公開",
    time: "1時間前",
  },
  {
    title: "サッカー日本代表 最新情報",
    time: "2時間前",
  },
];

const medalColor = [
  "bg-yellow-500",
  "bg-gray-400",
  "bg-orange-500",
  "bg-blue-600",
  "bg-blue-600",
];

export default function Sidebar() {
  return (
    <aside className="space-y-8">

      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">

        <h2 className="mb-8 text-3xl font-black text-slate-900">
          🔥 人気ランキング
        </h2>

        <div className="space-y-5">

          {ranking.map((item, index) => (

            <div
              key={index}
              className="flex items-start gap-4 border-b border-gray-100 pb-5 last:border-none"
            >

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black text-white ${medalColor[index]}`}
              >
                {index + 1}
              </div>

              <div className="flex-1">

                <h3 className="font-bold leading-6 text-slate-900 transition hover:text-blue-600">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  {item.time}
                </p>

              </div>

            </div>

          ))}

        </div>

      </div>

            {/* カテゴリー */}

      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">

        <h2 className="mb-6 text-3xl font-black text-slate-900">
          📂 カテゴリー
        </h2>

        <div className="flex flex-wrap gap-3">

          {[
            "国内",
            "芸能",
            "スポーツ",
            "経済",
            "テクノロジー",
            "政治",
            "国際",
            "ライフ"
          ].map((category) => (

            <button
              key={category}
              className="rounded-full border border-slate-200 bg-slate-100 px-5 py-3 font-bold text-slate-900 transition duration-300 hover:bg-blue-600 hover:text-white"
            >
              {category}
            </button>

          ))}

        </div>

      </div>

      {/* 広告 */}

      <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-xl">

        <p className="text-sm font-bold uppercase tracking-[0.2em]">
          Advertisement
        </p>

        <h2 className="mt-4 text-3xl font-black">
          Google AdSense
        </h2>

        <p className="mt-4 leading-7 text-blue-100">
          このエリアにGoogle AdSense広告を表示します。
        </p>

      </div>

    </aside>
  );
}