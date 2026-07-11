import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadDesignSections, loadIndex, type Entry } from "@/lib/catalog";
import { SiteFooter } from "@/app/_components/site-footer";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

/** セルの検索用 description（業種 × カラー × ムード + タグ）。 */
function cellDescription(entry: Entry): string {
  const tags = entry.tags.length > 0 ? `。タグ: ${entry.tags.join(", ")}` : "";
  return `業種 (JSIC) ${entry.jsic} × カラー ${entry.color} × ムード ${entry.mood} の DESIGN.md。AI がそのまま読んで一貫した UI を生成できるオープンカタログのセル${tags}。`;
}

/** 静的エクスポート: index.json の全 id をビルド時に列挙する。 */
export function generateStaticParams(): { id: string }[] {
  return loadIndex().entries.map((e) => ({ id: e.id }));
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
  // ビルド時に scripts/build-og.mjs が各セルのトークン (カラー/ムード/業種) を
  // 反映して生成する OG 画像 (public/og/{id}.png)。metadataBase で絶対 URL 化。
  const ogImage = `/og/${entry.id}.png`;
  const ogAlt = `${entry.title}（業種 ${entry.jsic} × カラー ${entry.color} × ムード ${entry.mood}）`;
  return {
    title: entry.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${entry.title} — ${SITE_NAME}`,
      description,
      type: "article",
      siteName: SITE_NAME,
      locale: "ja_JP",
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${entry.title} — ${SITE_NAME}`,
      description,
      images: [ogImage],
    },
  };
}

export default async function CellPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = findEntry(id);
  if (!entry) notFound();

  const index = loadIndex();
  const sections = loadDesignSections(entry.path);

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

  // ランドマーク整理: nav(パンくず) / header(banner) / main / footer(contentinfo)
  // を .wrap 直下の兄弟に配置する。
  return (
    <div className="wrap detail">
      <script
        type="application/ld+json"
        // ビルド時に信頼済みの自リポジトリ由来メタのみを埋め込む。
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="back-nav" aria-label="パンくず">
        <Link className="back" href="/">
          ← カタログへ戻る
        </Link>
      </nav>
      <header className="site-header">
        <h1>{entry.title}</h1>
        <p>
          <span className="chip">{entry.jsic}</span>{" "}
          <span className="chip">{entry.color}</span>{" "}
          <span className="chip">{entry.mood}</span>
        </p>
      </header>

      <main id="main-content" tabIndex={-1}>
      <dl>
        <dt>id</dt>
        <dd>{entry.id}</dd>
        <dt>DESIGN.md</dt>
        <dd>{entry.path}</dd>
        <dt>業種 (JSIC)</dt>
        <dd>{entry.jsic}</dd>
        <dt>カラー</dt>
        <dd>{entry.color}</dd>
        <dt>ムード</dt>
        <dd>{entry.mood}</dd>
        <dt>タグ</dt>
        <dd>{entry.tags.join(", ")}</dd>
        <dt>hash</dt>
        <dd>{entry.hash}</dd>
        <dt>createdAt</dt>
        <dd>{entry.createdAt}</dd>
      </dl>

      {sections ? (
        <section className="design" aria-labelledby="design-heading">
          <h2 id="design-heading" className="design-title">
            DESIGN.md 本文
          </h2>
          {sections.map((s) => (
            <article className="design-section" key={s.id} id={s.id}>
              <h3>
                {s.ja} <span className="section-id">/ {s.id}</span>
              </h3>
              {/* 本文はビルド時に信頼済みの自リポジトリ Markdown を HTML 化したもの。 */}
              <div
                className="design-body"
                dangerouslySetInnerHTML={{ __html: s.html }}
              />
            </article>
          ))}
        </section>
      ) : (
        <p className="design-empty">
          このセルはまだ DESIGN.md 本文が材化されていません（上記パスを参照）。
        </p>
      )}
      </main>

      <SiteFooter generatedAt={index.generatedAt} />
    </div>
  );
}
