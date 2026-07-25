"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";

/**
 * ルート layout の `<html lang>` は既定 ja。
 * `/en/` 配下だけクライアントで上書きする（セル二重生成を避ける最小スパイク）。
 */
export function LocaleHtmlLang({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
