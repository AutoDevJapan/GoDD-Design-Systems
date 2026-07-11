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

  const home: MetadataRoute.Sitemap[number] = {
    url: absoluteUrl("/"),
    lastModified: indexModified,
    changeFrequency: "weekly",
    priority: 1,
  };

  const cells: MetadataRoute.Sitemap = index.entries.map((entry) => ({
    url: absoluteUrl(`/cells/${entry.id}/`),
    lastModified: new Date(entry.updatedAt ?? entry.createdAt ?? index.generatedAt),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [home, ...cells];
}
