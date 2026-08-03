import SearchBar from "./SearchBar";
import Hero from "./Hero";
import NewsGrid from "./NewsGrid";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

type Props = {
  keyword: string;
};

export default function HomeLayout({ keyword }: Props) {
  return (
    <main className="bg-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Hero />

        <SearchBar />

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <NewsGrid keyword={keyword} />
          </div>

          <Sidebar />
        </div>
      </div>

      <Footer />
    </main>
  );
}