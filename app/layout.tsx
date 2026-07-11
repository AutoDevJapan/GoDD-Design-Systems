import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GoDD Design-Systems",
    template: "%s — GoDD Design-Systems",
  },
  description:
    "業種 (JSIC) × カラー (PCCS) × ムードで整理した、AI が読む DESIGN.md のオープンカタログ (MIT)。",
  openGraph: {
    title: "GoDD Design-Systems",
    description:
      "業種 × カラー × ムードで整理した、AI が読む DESIGN.md のオープンカタログ。",
    type: "website",
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
