"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { localeFromSearch, messagesFor, type Locale } from "@/lib/i18n";

function localeFromPath(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ja";
}

/** パスと `?lang=` からロケールを推定し、スキップリンク文言を切り替える。 */
export function SkipLink() {
  const pathname = usePathname() ?? "/";
  const [locale, setLocale] = useState<Locale>(() => localeFromPath(pathname));

  useEffect(() => {
    const pathLocale = localeFromPath(pathname);
    const queryLocale = localeFromSearch(window.location.search);
    setLocale(pathLocale === "en" || queryLocale === "en" ? "en" : "ja");
  }, [pathname]);

  const messages = messagesFor(locale);
  return (
    <a className="skip-link" href="#main-content">
      {messages.skipToContent}
    </a>
  );
}
