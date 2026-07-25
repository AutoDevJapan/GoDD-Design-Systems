"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";

/**
 * ルート layout の `<html lang>` は既定 ja。
 * `/en/` およびセル詳細 `?lang=en` でクライアント上書きする（二重静的生成を避ける）。
 */
export function LocaleHtmlLang({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
