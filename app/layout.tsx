import type { Metadata } from "next";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  // 相対 URL (canonical / OGP) を絶対化する基準。SEO の要。
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_NAME,
    description:
      "業種 × カラー × ムードで整理した、AI が読む DESIGN.md のオープンカタログ。",
    type: "website",
    siteName: SITE_NAME,
    locale: "ja_JP",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description:
      "業種 × カラー × ムードで整理した、AI が読む DESIGN.md のオープンカタログ。",
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
