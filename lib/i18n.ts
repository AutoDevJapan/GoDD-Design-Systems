/**
 * サイト chrome 向けの最小 i18n（Issue #25 / ADR-0002）。
 * DESIGN.md 本文の一括翻訳は対象外。セル詳細のロケール二重静的生成もしない。
 * セル chrome は単一路線 `/cells/{id}/` + `?lang=en` で切り替える（Phase 1）。
 *
 * メッセージは Client Component へ渡せるようプレーンな文字列のみとする。
 */

export const LOCALES = ["ja", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ja";

/** セル詳細の言語クエリ（静的二重生成を避ける）。 */
export const LANG_QUERY = "lang";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** `?lang=en` のみを英語とみなす（他値は既定 ja）。 */
export function localeFromSearch(search: string): Locale {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  return params.get(LANG_QUERY) === "en" ? "en" : "ja";
}

/** ロケール別のホームパス（trailingSlash 前提）。 */
export function homePath(locale: Locale): string {
  return locale === "en" ? "/en/" : "/";
}

/** セル詳細パス。EN chrome は `?lang=en` を付与（`/en/cells/` は作らない）。 */
export function cellPath(id: string, locale: Locale = "ja"): string {
  const base = `/cells/${id}/`;
  return locale === "en" ? `${base}?${LANG_QUERY}=en` : base;
}

/** 表示タイトル。`titleEn` があれば EN で優先、なければ `title`。 */
export function displayTitle(
  entry: { title: string; titleEn?: string },
  locale: Locale,
): string {
  return locale === "en" ? (entry.titleEn ?? entry.title) : entry.title;
}

export type UiMessages = {
  skipToContent: string;
  siteTagline: string;
  siteDescription: string;
  ogDescription: string;
  axesHeading: string;
  axesLeadBefore: string;
  axesLeadAfter: string;
  axisJsic: string;
  axisColor: string;
  axisMood: string;
  axisTag: string;
  catalogHeading: string;
  searchLabel: string;
  searchPlaceholder: string;
  /** `{filtered}` / `{total}` を置換する。 */
  resultCountTemplate: string;
  clearFilters: string;
  emptyResults: string;
  /** `{label}` `{value}` `{count}` を置換する。 */
  chipAriaTemplate: string;
  footerOperatorLabel: string;
  footerContactLabel: string;
  footerDisclosureLabel: string;
  footerBeforeLicense: string;
  footerAfterLicense: string;
  /** `{iso}` を置換する。 */
  footerGeneratedAtTemplate: string;
  localeSwitcherLabel: string;
  localeNameJa: string;
  localeNameEn: string;
  corpusNotice: string;
  backToCatalog: string;
  breadcrumbLabel: string;
  fieldId: string;
  fieldDesignMd: string;
  fieldJsic: string;
  fieldColor: string;
  fieldMood: string;
  fieldTags: string;
  fieldHash: string;
  fieldCreatedAt: string;
  designHeading: string;
  designEmpty: string;
  /** Pages remote カタログ読込中。 */
  catalogLoading: string;
  /** Pages remote カタログ読込失敗。 */
  catalogLoadError: string;
};

const ja: UiMessages = {
  skipToContent: "本文へスキップ",
  siteTagline:
    "業種 (JSIC) × カラー (PCCS) × ムードで整理した、AI がそのまま読める DESIGN.md のオープンカタログ。",
  siteDescription:
    "業種 (JSIC) × カラー (PCCS) × ムードで整理した、AI が読む DESIGN.md のオープンカタログ (MIT)。",
  ogDescription:
    "業種 × カラー × ムードで整理した、AI が読む DESIGN.md のオープンカタログ。",
  axesHeading: "分類軸で絞り込む",
  axesLeadBefore: "値集合の SSOT は ",
  axesLeadAfter:
    " で定義。チップを押すと下のカタログを絞り込みます（同一軸内は OR、軸をまたぐと AND）。件数は現在の絞り込みでの残件数です。",
  axisJsic: "業種 (JSIC)",
  axisColor: "カラー",
  axisMood: "ムード",
  axisTag: "タグ",
  catalogHeading: "カタログ",
  searchLabel: "セルを検索",
  searchPlaceholder: "タイトル / タグ / 軸で検索",
  resultCountTemplate: "{filtered} / {total} 件",
  clearFilters: "絞り込みをクリア",
  emptyResults: "条件に一致するセルがありません。",
  chipAriaTemplate: "{label} {value}（{count} 件）",
  footerOperatorLabel: "事業者",
  footerContactLabel: "お問い合わせ",
  footerDisclosureLabel: "事業者情報の開示請求",
  footerBeforeLicense: "© GoDD Design-Systems — License: ",
  footerAfterLicense:
    "。カラー軸は PCCS (日本色研配色体系) / JIS 無彩色、業種軸は日本標準産業分類 (JSIC) に基づく分類語彙を用いる。特定ブランドの色名・書体は含まない。",
  footerGeneratedAtTemplate: "index.json generatedAt: {iso}",
  localeSwitcherLabel: "言語",
  localeNameJa: "日本語",
  localeNameEn: "English",
  corpusNotice:
    "DESIGN.md 本文は現時点では日本語のままです。ページ chrome と分類ラベルは言語切替に追従します。",
  backToCatalog: "← カタログへ戻る",
  breadcrumbLabel: "パンくず",
  fieldId: "id",
  fieldDesignMd: "DESIGN.md",
  fieldJsic: "業種 (JSIC)",
  fieldColor: "カラー",
  fieldMood: "ムード",
  fieldTags: "タグ",
  fieldHash: "hash",
  fieldCreatedAt: "createdAt",
  designHeading: "DESIGN.md 本文",
  designEmpty:
    "このセルはまだ DESIGN.md 本文が材化されていません（上記パスを参照）。",
  catalogLoading: "カタログを読み込んでいます…",
  catalogLoadError:
    "カタログの読み込みに失敗しました。しばらくしてから再読み込みしてください。",
};

const en: UiMessages = {
  skipToContent: "Skip to content",
  siteTagline:
    "An open catalog of AI-readable DESIGN.md files, organized by industry (JSIC) × color (PCCS) × mood.",
  siteDescription:
    "Open catalog of AI-readable DESIGN.md files organized by industry (JSIC) × color (PCCS) × mood (MIT).",
  ogDescription:
    "An open catalog of AI-readable DESIGN.md files organized by industry × color × mood.",
  axesHeading: "Filter by axes",
  axesLeadBefore: "Axis value sets are defined in ",
  axesLeadAfter:
    ". Click chips to filter the catalog below (OR within an axis, AND across axes). Counts reflect the current filters.",
  axisJsic: "Industry (JSIC)",
  axisColor: "Color",
  axisMood: "Mood",
  axisTag: "Tag",
  catalogHeading: "Catalog",
  searchLabel: "Search cells",
  searchPlaceholder: "Search by title / tag / axis",
  resultCountTemplate: "{filtered} / {total}",
  clearFilters: "Clear filters",
  emptyResults: "No cells match the current filters.",
  chipAriaTemplate: "{label} {value} ({count})",
  footerOperatorLabel: "Operator",
  footerContactLabel: "Contact",
  footerDisclosureLabel: "Business information disclosure request",
  footerBeforeLicense: "© GoDD Design-Systems — License: ",
  footerAfterLicense:
    ". Color axis uses PCCS / JIS achromatic terms; industry axis uses Japan Standard Industrial Classification (JSIC). No brand-specific color or typeface names.",
  footerGeneratedAtTemplate: "index.json generatedAt: {iso}",
  localeSwitcherLabel: "Language",
  localeNameJa: "日本語",
  localeNameEn: "English",
  corpusNotice:
    "DESIGN.md body text remains Japanese for now. Page chrome and taxonomy labels follow the language switcher.",
  backToCatalog: "← Back to catalog",
  breadcrumbLabel: "Breadcrumb",
  fieldId: "id",
  fieldDesignMd: "DESIGN.md",
  fieldJsic: "Industry (JSIC)",
  fieldColor: "Color",
  fieldMood: "Mood",
  fieldTags: "Tags",
  fieldHash: "hash",
  fieldCreatedAt: "createdAt",
  designHeading: "DESIGN.md body",
  designEmpty:
    "This cell has no materialized DESIGN.md body yet (see the path above).",
  catalogLoading: "Loading catalog…",
  catalogLoadError: "Failed to load the catalog. Please reload and try again.",
};

const MESSAGES: Record<Locale, UiMessages> = { ja, en };

export function messagesFor(locale: Locale): UiMessages {
  return MESSAGES[locale];
}

/** metadata.alternates.languages / hreflang 用（trailingSlash 前提）。 */
export const SITE_LANGUAGE_ALTERNATES: Record<string, string> = {
  ja: "/",
  en: "/en/",
  "x-default": "/",
};

export function localeDisplayName(messages: UiMessages, locale: Locale): string {
  return locale === "ja" ? messages.localeNameJa : messages.localeNameEn;
}

export function fillTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}
