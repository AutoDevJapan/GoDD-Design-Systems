import type { Metadata } from "next";
import { loadIndex } from "@/lib/catalog";
import { SiteFooter } from "@/app/_components/site-footer";
import { LocaleSwitcher } from "@/app/_components/locale-switcher";
import { LocaleHtmlLang } from "@/app/_components/locale-html-lang";
import {
  CatalogExplorer,
  type CatalogCell,
} from "@/app/_components/catalog-explorer";
import { messagesFor, SITE_LANGUAGE_ALTERNATES } from "@/lib/i18n";
import { SITE_NAME } from "@/lib/site";

const locale = "en" as const;
const messages = messagesFor(locale);

export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  description: messages.siteDescription,
  alternates: {
    canonical: "/en/",
    languages: SITE_LANGUAGE_ALTERNATES,
  },
  openGraph: {
    title: SITE_NAME,
    description: messages.ogDescription,
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: "/en/",
    images: [{ url: "/og/home.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: messages.ogDescription,
    images: ["/og/home.png"],
  },
};

/**
 * 英語ホーム（Issue #25 / ADR-0002 Phase 0）。
 * カタログ UI chrome のみ英訳。セル title / DESIGN.md 本文は日本語のまま。
 */
export default function EnglishHomePage() {
  const index = loadIndex();
  const cells: CatalogCell[] = index.entries.map((e) => ({
    id: e.id,
    title: e.title,
    jsic: e.jsic,
    color: e.color,
    mood: e.mood,
    tags: e.tags,
  }));

  return (
    <div className="wrap">
      <LocaleHtmlLang locale={locale} />
      <header className="site-header">
        <div className="site-header-top">
          <h1>GoDD Design-Systems</h1>
          <LocaleSwitcher locale={locale} messages={messages} />
        </div>
        <p>{messages.siteTagline}</p>
        <p className="corpus-notice" role="note">
          {messages.corpusNotice}
        </p>
      </header>

      <main id="main-content" tabIndex={-1}>
        <CatalogExplorer cells={cells} messages={messages} />
      </main>

      <SiteFooter generatedAt={index.generatedAt} messages={messages} />
    </div>
  );
}
