import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "News AI",
  description: "AIニュースサイト",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}