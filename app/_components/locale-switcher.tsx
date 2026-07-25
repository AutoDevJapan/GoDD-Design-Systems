import Link from "next/link";
import {
  homePath,
  localeDisplayName,
  type Locale,
  type UiMessages,
} from "@/lib/i18n";

/** ホーム JA/EN を切り替える最小スイッチャ（セル詳細の二重生成はしない）。 */
export function LocaleSwitcher({
  locale,
  messages,
}: {
  locale: Locale;
  messages: UiMessages;
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
      <Link className="locale-link" href={homePath(other)} hrefLang={other}>
        {localeDisplayName(messages, other)}
      </Link>
    </nav>
  );
}
