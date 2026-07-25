import Link from "next/link";
import {
  homePath,
  localeDisplayName,
  type Locale,
  type UiMessages,
} from "@/lib/i18n";

/**
 * JA/EN スイッチャ。
 * - ホーム: `hrefForLocale` / 既定の `/` ↔ `/en/`
 * - セル詳細: `onSelectLocale` で同経路 + `?lang=en` を切替（二重静的生成しない）
 */
export function LocaleSwitcher({
  locale,
  messages,
  hrefForLocale,
  onSelectLocale,
}: {
  locale: Locale;
  messages: UiMessages;
  hrefForLocale?: (locale: Locale) => string;
  onSelectLocale?: (locale: Locale) => void;
}) {
  const other: Locale = locale === "ja" ? "en" : "ja";
  return (
    <nav className="locale-switcher" aria-label={messages.localeSwitcherLabel}>
      <span className="locale-current" aria-current="true">
        {localeDisplayName(messages, locale)}
      </span>
      <span className="locale-sep" aria-hidden="true">
        /
      </span>
      {onSelectLocale ? (
        <button
          type="button"
          className="locale-link"
          onClick={() => onSelectLocale(other)}
        >
          {localeDisplayName(messages, other)}
        </button>
      ) : (
        <Link
          className="locale-link"
          href={hrefForLocale?.(other) ?? homePath(other)}
          hrefLang={other}
        >
          {localeDisplayName(messages, other)}
        </Link>
      )}
    </nav>
  );
}
