import type { MetadataRoute } from "next";
import { loadIndex } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/site";

// `output: 'export'`（静的エクスポート）で sitemap.xml を静的生成するために必須。
export const dynamic = "force-static";

/**
 * sitemap.xml を静的生成する（Metadata Route）。`output: 'export'` と両立し、
 * ビルド時に `out/sitemap.xml` として書き出される。
 * トップページ + `index.json` の全セル詳細 URL を列挙する。
 * URL は `trailingSlash: true`（next.config.mjs）に合わせて末尾スラッシュ付き。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const index = loadIndex();
  const indexModified = new Date(index.generatedAt);

  const homeJa: MetadataRoute.Sitemap[number] = {
    url: absoluteUrl("/"),
    lastModified: indexModified,
    changeFrequency: "weekly",
    priority: 1,
  };

  // 英語ホームのみ（セル詳細のロケール二重列挙はしない — ADR-0002）。
  const homeEn: MetadataRoute.Sitemap[number] = {
    url: absoluteUrl("/en/"),
    lastModified: indexModified,
    changeFrequency: "weekly",
    priority: 0.9,
  };

  const cells: MetadataRoute.Sitemap = index.entries.map((entry) => ({
    url: absoluteUrl(`/cells/${entry.id}/`),
    lastModified: new Date(entry.updatedAt ?? entry.createdAt ?? index.generatedAt),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [homeJa, homeEn, ...cells];
}
