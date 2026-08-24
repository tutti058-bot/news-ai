import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://tutti-news-ai-bay.vercel.app";

  const news = await prisma.news.findMany({
    where: {
      publishedAt: {
        not: null,
      },
    },
    select: {
      id: true,
      publishedAt: true,
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  const newsUrls: MetadataRoute.Sitemap = news.map((item) => ({
    url: `${baseUrl}/news/${item.id}`,
    lastModified: item.publishedAt ?? new Date(),
  }));

  const columns = await prisma.column.findMany({
    where: {
      isPublished: true,
    },
    select: {
      slug: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const columnUrls: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/column`,
      lastModified: new Date(),
    },
    ...columns.map((column) => ({
      url: `${baseUrl}/column/${column.slug}`,
      lastModified: column.updatedAt,
    })),
  ];

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
    },
    ...newsUrls,
    ...columnUrls,
  ];
}