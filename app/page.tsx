import Header from "@/components/Header";
import TrendingBar from "@/components/TrendingBar";
import HomeLayout from "@/components/HomeLayout";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
}) {
  const { q = "", page = "1" } = await searchParams;

  return (
    <>
      <Header />
      <TrendingBar />
      <HomeLayout
        keyword={q}
        page={Number(page)}
      />
    </>
  );
}