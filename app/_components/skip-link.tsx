"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { localeFromSearch, messagesFor, type Locale } from "@/lib/i18n";

function localeFromPath(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ja";
}

/**
 * パス・`?lang=`・`<html lang>`（LocaleHtmlLang）からロケールを推定する。
 * セル詳細は pushState で言語切替するため、lang 属性の MutationObserver も使う。
 */
export function SkipLink() {
  const pathname = usePathname() ?? "/";
  const [locale, setLocale] = useState<Locale>(() => localeFromPath(pathname));

  useEffect(() => {
    const sync = () => {
      const pathEn = localeFromPath(pathname) === "en";
      const queryEn = localeFromSearch(window.location.search) === "en";
      const htmlEn = document.documentElement.lang === "en";
      setLocale(pathEn || queryEn || htmlEn ? "en" : "ja");
    };
    sync();
    window.addEventListener("popstate", sync);
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    return () => {
      window.removeEventListener("popstate", sync);
      obs.disconnect();
    };
  }, [pathname]);

  const messages = messagesFor(locale);
  return (
    <a className="skip-link" href="#main-content">
      {messages.skipToContent}
    </a>
  );
}
