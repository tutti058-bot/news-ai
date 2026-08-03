import Header from "@/components/Header";
import TrendingBar from "@/components/TrendingBar";
import HomeLayout from "@/components/HomeLayout";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;

  return (
    <>
      <Header />
      <TrendingBar />
      <HomeLayout keyword={q} />
    </>
  );
}