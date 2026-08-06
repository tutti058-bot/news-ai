import "./globals.css";
import type { Metadata } from "next";


export const metadata: Metadata = {
  title: {
    default: "AI News ジャパン",
    template: "%s | AI News ジャパン",
  },

  description:
    "AIが国内外の最新ニュースをわかりやすく要約・分析。テクノロジー・経済・国際・スポーツなどを毎日更新。",

    verification: {
  google: "q32C9II99s52eLn7AgCdhIt6j3aRMIA82mfJ4vjyKQA",
},

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    title: "AI News ジャパン",
    description:
      "AIが国内外の最新ニュースをわかりやすく要約・分析。",
    siteName: "AI News ジャパン",
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
      <body>
  {children}

  <footer className="mt-20 border-t bg-gray-50">
    <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-6 px-6 py-8 text-sm text-gray-600">
      <a href="/about" className="hover:text-blue-600">
        運営者情報
      </a>

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
      © {new Date().getFullYear()} AI News ジャパン
    </p>
  </footer>
</body>
    </html>
  );
}