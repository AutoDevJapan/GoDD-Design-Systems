import { PAGES_SITE_URL } from "@/lib/site-urls";

/**
 * 公開サイトの基準 URL とメタ定数（SEO 用の SSOT）。
 *
 * canonical / OpenGraph / sitemap / robots が絶対 URL を生成するために使う。
 * 環境ごとに `NEXT_PUBLIC_SITE_URL` で上書きできる（未設定時は GitHub Pages）。
 * 末尾スラッシュは持たせない（付与は各所で行う）。
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL ?? PAGES_SITE_URL
).replace(/\/+$/, "");

/** サイト名（OpenGraph `siteName` 等で使用）。 */
export const SITE_NAME = "GoDD Design-Systems";

/** サイト全体の既定 description（日本語）。英語は `lib/i18n.ts` を参照。 */
export const SITE_DESCRIPTION =
  "業種 (JSIC) × カラー (PCCS) × ムードで整理した、AI が読む DESIGN.md のオープンカタログ (MIT)。";

/**
 * サイト内パス（先頭 `/`）を絶対 URL に解決する。
 * 例: `absoluteUrl("/cells/foo/")` → `https://.../cells/foo/`。
 * Pages の basePath は `NEXT_PUBLIC_SITE_URL` に含める（オリジン+プレフィックス）。
 */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
