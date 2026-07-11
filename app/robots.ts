import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// `output: 'export'`（静的エクスポート）で robots.txt を静的生成するために必須。
export const dynamic = "force-static";

/**
 * robots.txt を静的生成する（Metadata Route）。`output: 'export'` と両立し、
 * ビルド時に `out/robots.txt` として書き出される。
 * 公開カタログのため全クローラを許可し、sitemap を明示する。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
