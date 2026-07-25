import type { Metadata } from "next";
import "./globals.css";
import { SkipLink } from "@/app/_components/skip-link";
import { messagesFor, SITE_LANGUAGE_ALTERNATES } from "@/lib/i18n";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const defaultMessages = messagesFor("ja");

export const metadata: Metadata = {
  // 相対 URL (canonical / OGP) を絶対化する基準。SEO の要。
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: defaultMessages.siteDescription,
  alternates: {
    languages: SITE_LANGUAGE_ALTERNATES,
  },
  openGraph: {
    title: SITE_NAME,
    description: defaultMessages.ogDescription,
    type: "website",
    siteName: SITE_NAME,
    locale: "ja_JP",
    // ビルド時に scripts/build-og.mjs が生成する OG 画像 (public/og/home.png)。
    // metadataBase により絶対 URL 化される。
    images: [{ url: "/og/home.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: defaultMessages.ogDescription,
    images: ["/og/home.png"],
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
        {/* キーボード / スクリーンリーダ利用者が反復コンテンツを飛ばして本文へ */}
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
