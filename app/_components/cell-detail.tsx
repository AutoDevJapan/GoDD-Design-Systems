"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SiteFooter } from "@/app/_components/site-footer";
import { LocaleSwitcher } from "@/app/_components/locale-switcher";
import { LocaleHtmlLang } from "@/app/_components/locale-html-lang";
import type { DesignSection } from "@/lib/catalog";
import {
  displayTitle,
  homePath,
  LANG_QUERY,
  localeFromSearch,
  messagesFor,
  type Locale,
} from "@/lib/i18n";
import {
  facetDisplayLabel,
  type TaxonomyLabelMaps,
} from "@/lib/taxonomy-labels";

export type CellDetailEntry = {
  id: string;
  path: string;
  jsic: string;
  color: string;
  mood: string;
  tags: string[];
  title: string;
  titleEn?: string;
  hash: string;
  createdAt: string;
};

/**
 * セル詳細の chrome（Issue #25 Phase 1）。
 * 単一路線 `/cells/{id}/` で `?lang=en` により chrome / 分類ラベルのみ英訳。
 * DESIGN.md 本文は常に材化済み日本語を表示する。
 */
export function CellDetail({
  entry,
  sections,
  generatedAt,
  labelsByLocale,
}: {
  entry: CellDetailEntry;
  sections: DesignSection[] | null;
  generatedAt: string;
  labelsByLocale: Record<Locale, TaxonomyLabelMaps>;
}) {
  const [locale, setLocale] = useState<Locale>("ja");

  useEffect(() => {
    const sync = () => setLocale(localeFromSearch(window.location.search));
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const selectLocale = useCallback((next: Locale) => {
    const url = new URL(window.location.href);
    if (next === "en") url.searchParams.set(LANG_QUERY, "en");
    else url.searchParams.delete(LANG_QUERY);
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.pushState(null, "", nextUrl);
    setLocale(next);
  }, []);

  const messages = messagesFor(locale);
  const labels = labelsByLocale[locale];
  const title = displayTitle(entry, locale);
  const jsicLabel = facetDisplayLabel("jsic", entry.jsic, labels);
  const colorLabel = facetDisplayLabel("color", entry.color, labels);
  const moodLabel = facetDisplayLabel("mood", entry.mood, labels);

  return (
    <div className="wrap detail">
      <LocaleHtmlLang locale={locale} />
      <nav className="back-nav" aria-label={messages.breadcrumbLabel}>
        <Link className="back" href={homePath(locale)}>
          {messages.backToCatalog}
        </Link>
      </nav>
      <header className="site-header">
        <div className="site-header-top">
          <h1>{title}</h1>
          <LocaleSwitcher
            locale={locale}
            messages={messages}
            onSelectLocale={selectLocale}
          />
        </div>
        <p>
          <span
            className="chip"
            title={jsicLabel !== entry.jsic ? entry.jsic : undefined}
          >
            {jsicLabel}
          </span>{" "}
          <span className="chip" title={entry.color}>
            {colorLabel}
          </span>{" "}
          <span className="chip" title={entry.mood}>
            {moodLabel}
          </span>
        </p>
        {locale === "en" ? (
          <p className="corpus-notice" role="note">
            {messages.corpusNotice}
          </p>
        ) : null}
      </header>

      <main id="main-content" tabIndex={-1}>
        <dl>
          <dt>{messages.fieldId}</dt>
          <dd>{entry.id}</dd>
          <dt>{messages.fieldDesignMd}</dt>
          <dd>{entry.path}</dd>
          <dt>{messages.fieldJsic}</dt>
          <dd>
            {jsicLabel}
            {jsicLabel !== entry.jsic ? (
              <span className="code-hint"> ({entry.jsic})</span>
            ) : null}
          </dd>
          <dt>{messages.fieldColor}</dt>
          <dd>
            {colorLabel}
            {colorLabel !== entry.color ? (
              <span className="code-hint"> ({entry.color})</span>
            ) : null}
          </dd>
          <dt>{messages.fieldMood}</dt>
          <dd>
            {moodLabel}
            {moodLabel !== entry.mood ? (
              <span className="code-hint"> ({entry.mood})</span>
            ) : null}
          </dd>
          <dt>{messages.fieldTags}</dt>
          <dd>{entry.tags.join(", ")}</dd>
          <dt>{messages.fieldHash}</dt>
          <dd>{entry.hash}</dd>
          <dt>{messages.fieldCreatedAt}</dt>
          <dd>{entry.createdAt}</dd>
        </dl>

        {sections ? (
          <section className="design" aria-labelledby="design-heading">
            <h2 id="design-heading" className="design-title">
              {messages.designHeading}
            </h2>
            {sections.map((s) => (
              <article className="design-section" key={s.id} id={s.id}>
                <h3>
                  {s.ja} <span className="section-id">/ {s.id}</span>
                </h3>
                <div
                  className="design-body"
                  dangerouslySetInnerHTML={{ __html: s.html }}
                />
              </article>
            ))}
          </section>
        ) : (
          <p className="design-empty">{messages.designEmpty}</p>
        )}
      </main>

      <SiteFooter generatedAt={generatedAt} messages={messages} />
    </div>
  );
}
