import type { Metadata } from "next";
import { loadIndex } from "@/lib/catalog";
import { SiteFooter } from "@/app/_components/site-footer";
import { LocaleSwitcher } from "@/app/_components/locale-switcher";
import {
  CatalogExplorer,
  type CatalogCell,
} from "@/app/_components/catalog-explorer";
import { messagesFor, SITE_LANGUAGE_ALTERNATES } from "@/lib/i18n";
import { taxonomyLabelsFor } from "@/lib/taxonomy-labels";
import { SITE_NAME } from "@/lib/site";

const locale = "ja" as const;
const messages = messagesFor(locale);

export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  description: messages.siteDescription,
  alternates: {
    canonical: "/",
    languages: SITE_LANGUAGE_ALTERNATES,
  },
  openGraph: {
    title: SITE_NAME,
    description: messages.ogDescription,
    type: "website",
    siteName: SITE_NAME,
    locale: "ja_JP",
    url: "/",
    images: [{ url: "/og/home.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: messages.ogDescription,
    images: ["/og/home.png"],
  },
};

export default function HomePage() {
  const index = loadIndex();

  // ビルド時に軽量インデックス（ブラウズに必要な最小情報）を埋め込み、
  // クライアント側で絞り込み / 検索する。静的エクスポート (output: export)
  // と両立し、全セルが初期 HTML に含まれるため SEO も損なわない。
  const cells: CatalogCell[] = index.entries.map((e) => ({
    id: e.id,
    title: e.title,
    titleEn: e.titleEn,
    jsic: e.jsic,
    color: e.color,
    mood: e.mood,
    tags: e.tags,
  }));
  const taxonomyLabels = taxonomyLabelsFor(locale);

  // ランドマーク整理: header(banner) / main / footer(contentinfo) を .wrap 直下の
  // 兄弟に配置する。header/footer を main の子孫に置くとランドマーク扱いされないため。
  return (
    <div className="wrap">
      <header className="site-header">
        <div className="site-header-top">
          <h1>GoDD Design-Systems</h1>
          <LocaleSwitcher locale={locale} messages={messages} />
        </div>
        <p>{messages.siteTagline}</p>
      </header>

      <main id="main-content" tabIndex={-1}>
        <CatalogExplorer
          cells={cells}
          messages={messages}
          locale={locale}
          taxonomyLabels={taxonomyLabels}
        />
      </main>

      <SiteFooter generatedAt={index.generatedAt} messages={messages} />
    </div>
  );
}
