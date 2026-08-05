import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NEWS AI",
  description: "AIが選ぶ最新ニュース",

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    siteName: "NEWS AI",
  },

  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}