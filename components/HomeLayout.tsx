import SearchBar from "./SearchBar";
import Hero from "./Hero";
import NewsGrid from "./NewsGrid";
import Sidebar from "./Sidebar";
import ColumnPreview from "./ColumnPreview";
import ContentRequestBox from "./ContentRequestBox";
import NewsAnalysisGuide from "./NewsAnalysisGuide";
import RakutenWidget from "./RakutenWidget";

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

        {/* 楽天ページマッチ */}
        <RakutenWidget />

        {/* Search */}
        <div className="mt-5 sm:mt-8">
          <SearchBar />
        </div>

        {/* ニュース分析について */}
        <NewsAnalysisGuide />

        {/* 注目コラム */}
        <ColumnPreview />

        {/* Main */}
        <div className="mt-7 grid grid-cols-1 gap-7 lg:mt-10 lg:gap-10 lg:grid-cols-[2fr_360px]">

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

        {/* みんなのリクエストBOX */}
        <div className="mt-8 sm:mt-12">
          <ContentRequestBox />
        </div>

      </div>


    </main>
  );
}