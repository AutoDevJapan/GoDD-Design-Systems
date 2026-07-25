/**
 * 公開 URL 定数（Client / Server 共用。fs 非依存）。
 * Pages カタログの remote fetch / blob 誘導で使う。
 */

/** 公開ブラウズの canonical オリジン（末尾スラッシュなし）。 */
export const PAGES_SITE_URL =
  "https://autodevjapan.github.io/GoDD-Design-Systems";

/** raw.githubusercontent.com 上の index.json（Pages カタログの遅延取得元）。 */
export const REMOTE_INDEX_URL =
  "https://raw.githubusercontent.com/AutoDevJapan/GoDD-Design-Systems/main/index.json";

/** DESIGN.md の GitHub blob ベース（末尾スラッシュなし）。 */
export const REPO_BLOB_BASE =
  "https://github.com/AutoDevJapan/GoDD-Design-Systems/blob/main";

export function githubBlobUrl(path: string): string {
  const cleaned = path.replace(/^\/+/, "");
  return `${REPO_BLOB_BASE}/${cleaned}`;
}
