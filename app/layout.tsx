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