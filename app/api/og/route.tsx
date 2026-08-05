import { ImageResponse } from "@vercel/og";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const id = Number(searchParams.get("id"));

  if (!id) {
    return new Response("Missing id", {
      status: 400,
    });
  }

  const news = await prisma.news.findUnique({
    where: {
      id,
    },
  });

  if (!news) {
    return new Response("News not found", {
      status: 404,
    });
  }

  const logo = new URL("/logo.png", request.url).toString();
  const bg = new URL("/og-bg.png", request.url).toString();

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundImage: `url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: "60px",
          color: "#ffffff",
          position: "relative",
        }}
      >
        <img
          src={logo}
          style={{
            width: "110px",
            height: "60px",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "70px",
          }}
        >
          <div
            style={{
              fontSize: "64px",
              fontWeight: 900,
              lineHeight: 1.1,
              width: "980px",
            }}
          >
            {news.title}
          </div>

          <div
            style={{
              marginTop: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#2563EB",
              color: "#FFFFFF",
              borderRadius: "999px",
              width: "140px",
              height: "44px",
              fontSize: "20px",
              fontWeight: 700,
            }}
          >
            {news.category ?? ""}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: "60px",
            bottom: "40px",
            fontSize: "18px",
            color: "#E2E8F0",
            fontWeight: 600,
          }}
        >
          news-ai.jp
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}