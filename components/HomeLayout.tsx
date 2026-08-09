import SearchBar from "./SearchBar";
import Hero from "./Hero";
import NewsGrid from "./NewsGrid";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

type Props = {
  keyword: string;
  page: number;
};

export default function HomeLayout({
  keyword,
  page,
}: Props) {
  return (
    <main className="min-h-screen bg-slate-100">

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">

        {/* Hero */}
        <Hero />

        {/* Search */}
        <div className="mt-8">
          <SearchBar />
        </div>

        {/* Daily Summary */}
<div className="mt-6">
  <a
    href="/daily-summary"
    className="group flex items-center justify-between rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl"
  >
    <div>
      <p className="text-sm font-bold text-blue-100">
        AI NEWS ジャパン
      </p>

      <h2 className="mt-1 text-xl font-black sm:text-2xl">
        📰 今日1日のニュースまとめ
      </h2>

      <p className="mt-1 text-sm text-blue-100">
        AIが主要ニュースを厳選してまとめています
      </p>
    </div>

    <span className="ml-4 shrink-0 rounded-full bg-white px-4 py-2 text-sm font-black text-blue-600 transition group-hover:bg-slate-900 group-hover:text-white">
      見る →
    </span>
  </a>
</div>

        {/* Main */}
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[2fr_360px]">

          <div>
            <NewsGrid
              keyword={keyword}
              page={page}
            />
          </div>

          <aside className="order-last lg:order-none">
            <Sidebar />
          </aside>

        </div>

      </div>

      <Footer />

    </main>
  );
}