import { loadIndex, type Entry } from "@/lib/catalog";
import { githubBlobUrl } from "@/lib/site-urls";

export { REMOTE_INDEX_URL, PAGES_SITE_URL } from "@/lib/site-urls";

/**
 * GitHub Pages 向けビルドか（`GODD_PAGES_BUILD=1`）。
 * basePath / セル静的生成スキップ / OG home-only / カタログ詳細リンク切替の共通ゲート。
 * SSOT: documents/adr/0004-github-pages-browse-hosting.md
 */
export function isPagesBuild(): boolean {
  return process.env.GODD_PAGES_BUILD === "1";
}

/** プロジェクト Pages の URL プレフィックス（リポジトリ名）。先頭スラッシュ付き・末尾なし。 */
export const PAGES_BASE_PATH = "/GoDD-Design-Systems";

/**
 * 静的エクスポートするセル id 一覧。
 * Pages ビルドでは既定 1（`output: export` は空の generateStaticParams を拒否するため）。
 * 51k 全件は出さない。`GODD_STATIC_CELL_LIMIT` で上書き可能。
 */
export function listStaticCellParams(): { id: string }[] {
  const entries = loadIndex().entries;
  const limitRaw = process.env.GODD_STATIC_CELL_LIMIT;

  if (isPagesBuild()) {
    // Next.js `output: export` は空配列を「generateStaticParams 欠落」とみなす。
    const limit = limitRaw !== undefined ? Number(limitRaw) : 1;
    const n =
      Number.isFinite(limit) && limit > 0 ? Math.min(limit, entries.length) : 1;
    return entries.slice(0, n).map((e) => ({ id: e.id }));
  }

  if (limitRaw !== undefined) {
    const limit = Number(limitRaw);
    if (!Number.isFinite(limit) || limit <= 0) return [];
    return entries.slice(0, limit).map((e) => ({ id: e.id }));
  }

  return entries.map((e) => ({ id: e.id }));
}

/**
 * sitemap に載せるセルエントリ。Pages では静的に出した分のみ（既定 1）。
 * カタログの GitHub blob 誘導分は載せない。
 */
export function listSitemapCellEntries(): Entry[] {
  if (isPagesBuild()) {
    const limitRaw = process.env.GODD_STATIC_CELL_LIMIT;
    const limit = limitRaw !== undefined ? Number(limitRaw) : 1;
    const n =
      Number.isFinite(limit) && limit > 0
        ? Math.min(limit, loadIndex().entries.length)
        : 1;
    return loadIndex().entries.slice(0, n);
  }
  return loadIndex().entries;
}

/**
 * カタログカードの詳細リンク。
 * Pages ではセル HTML を出さないため、DESIGN.md の GitHub blob へ誘導する。
 */
export function cellDetailHref(entry: Pick<Entry, "id" | "path">): string {
  if (isPagesBuild()) {
    return githubBlobUrl(entry.path);
  }
  return `/cells/${entry.id}/`;
}
