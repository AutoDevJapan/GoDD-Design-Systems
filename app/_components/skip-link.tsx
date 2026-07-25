"use client";

import { usePathname } from "next/navigation";
import { messagesFor } from "@/lib/i18n";

/** パスからロケールを推定し、スキップリンク文言を切り替える。 */
export function SkipLink() {
  const pathname = usePathname() ?? "/";
  const locale = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ja";
  const messages = messagesFor(locale);
  return (
    <a className="skip-link" href="#main-content">
      {messages.skipToContent}
    </a>
  );
}
