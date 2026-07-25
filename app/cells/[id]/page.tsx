import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadDesignSections, loadIndex, type Entry } from "@/lib/catalog";
import { isPagesBuild, listStaticCellParams } from "@/lib/pages-build";
import { CellDetail } from "@/app/_components/cell-detail";
import { taxonomyLabelsFor } from "@/lib/taxonomy-labels";
import { displayTitle } from "@/lib/i18n";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

/** セルの検索用 description（業種 × カラー × ムード + タグ）。メタは既定 ja。 */
function cellDescription(entry: Entry): string {
  const tags = entry.tags.length > 0 ? `。タグ: ${entry.tags.join(", ")}` : "";
  return `業種 (JSIC) ${entry.jsic} × カラー ${entry.color} × ムード ${entry.mood} の DESIGN.md。AI がそのまま読んで一貫した UI を生成できるオープンカタログのセル${tags}。`;
}

/**
 * 静的エクスポート対象のセル id。
 * Pages ビルドでは既定 1 件のみ（51k HTML を CI に載せない — ADR-0004）。
 */
export function generateStaticParams(): { id: string }[] {
  return listStaticCellParams();
}

// index.json に無い id は 404 (未知パラメータを生成しない)。
export const dynamicParams = false;

function findEntry(id: string): Entry | undefined {
  return loadIndex().entries.find((e) => e.id === id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const entry = findEntry(id);
  if (!entry) return { title: "セルが見つかりません" };

  const canonical = `/cells/${entry.id}/`;
  const description = cellDescription(entry);
  const title = displayTitle(entry, "ja");
  // ビルド時に scripts/build-og.mjs が各セルのトークン (カラー/ムード/業種) を
  // 反映して生成する OG 画像 (public/og/{id}.png)。metadataBase で絶対 URL 化。
  const ogImage = `/og/${entry.id}.png`;
  const ogAlt = `${title}（業種 ${entry.jsic} × カラー ${entry.color} × ムード ${entry.mood}）`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} — ${SITE_NAME}`,
      description,
      type: "article",
      siteName: SITE_NAME,
      locale: "ja_JP",
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — ${SITE_NAME}`,
      description,
      images: [ogImage],
    },
  };
}

/**
 * セル詳細。ロケール二重静的生成は行わない（ADR-0002）。
 * chrome EN はクライアントで `?lang=en` を解釈する（Phase 1）。
 */
export default async function CellPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = findEntry(id);
  if (!entry) notFound();

  const index = loadIndex();
  // Pages では本文を読まない（design-md 全件トレース / CI コスト回避。カタログは blob 誘導）。
  const sections = isPagesBuild() ? null : loadDesignSections(entry.path);

  // 構造化データ (JSON-LD)。検索エンジンにセルの意味 (作品/データセット項目) を伝える。
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: entry.title,
    description: cellDescription(entry),
    url: absoluteUrl(`/cells/${entry.id}/`),
    identifier: entry.id,
    inLanguage: "ja",
    license: "https://opensource.org/licenses/MIT",
    isPartOf: { "@type": "Collection", name: SITE_NAME, url: absoluteUrl("/") },
    keywords: [entry.jsic, entry.color, entry.mood, ...entry.tags].join(", "),
    dateCreated: entry.createdAt,
    dateModified: entry.updatedAt ?? entry.createdAt,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CellDetail
        entry={{
          id: entry.id,
          path: entry.path,
          jsic: entry.jsic,
          color: entry.color,
          mood: entry.mood,
          tags: entry.tags,
          title: entry.title,
          titleEn: entry.titleEn,
          hash: entry.hash,
          createdAt: entry.createdAt,
        }}
        sections={sections}
        generatedAt={index.generatedAt}
        labelsByLocale={{
          ja: taxonomyLabelsFor("ja"),
          en: taxonomyLabelsFor("en"),
        }}
      />
    </>
  );
}
