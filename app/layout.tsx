import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: {
    default: "AI NEWS ジャパン",
    template: "%s | AI NEWS ジャパン",
  },

  description:
    "AIが国内外の最新ニュースをわかりやすく要約・分析。テクノロジー・経済・国際・スポーツなどを毎日更新。",

  metadataBase: new URL("https://tutti-news-ai-bay.vercel.app"),

  verification: {
    google: "q32C9II99s52eLn7AgCdhIt6j3aRMIA82mfJ4vjyKQA",
  },

  other: {
    "google-adsense-account": "ca-pub-6538997075638239",
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    title: "AI NEWS ジャパン",
    description:
      "AIが国内外の最新ニュースをわかりやすく要約・分析。",
    url: "https://tutti-news-ai-bay.vercel.app",
    siteName: "AI NEWS ジャパン",
    images: [
      {
        url: "/ogp.png",
        width: 1200,
        height: 630,
        alt: "AI NEWS ジャパン",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "AI NEWS ジャパン",
    description:
      "AIが国内外の最新ニュースをわかりやすく要約・分析。",
    images: ["/ogp.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
  <Script
    async
    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6538997075638239"
    crossOrigin="anonymous"
  />
  
  {children}

        <footer className="mt-12 border-t border-gray-200">
          <div className="mx-auto flex max-w-6xl justify-center gap-6 px-4 py-6 text-sm text-gray-500">
            <a href="/privacy" className="hover:text-blue-600">
              プライバシーポリシー
            </a>

            <a href="/contact" className="hover:text-blue-600">
              お問い合わせ
            </a>

            <a href="/terms" className="hover:text-blue-600">
              利用規約
            </a>
          </div>

          <p className="pb-6 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} AI NEWS ジャパン
          </p>
        </footer>
      </body>
    </html>
  );
}