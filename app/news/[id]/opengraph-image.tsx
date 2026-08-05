import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  const news = await prisma.news.findUnique({
    where: {
      id: Number(id),
    },
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0f172a",
          color: "#fff",
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: "#60a5fa",
            fontWeight: 700,
          }}
        >
          NEWS AI
        </div>

        <div
          style={{
            marginTop: 30,
            fontSize: 64,
            fontWeight: 900,
            lineHeight: 1.2,
          }}
        >
          {news?.title ?? "NEWS AI"}
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 24,
            color: "#cbd5e1",
          }}
        >
          {news?.category ?? ""}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}