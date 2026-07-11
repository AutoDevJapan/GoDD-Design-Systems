import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";

/** index.json の 1 エントリ (documents/schema/index.schema.json 準拠)。 */
export type Entry = {
  id: string;
  path: string;
  jsic: string;
  color: string;
  mood: string;
  tags: string[];
  title: string;
  hash: string;
  createdAt: string;
};

export type IndexFile = {
  version: number;
  generatedAt: string;
  entries: Entry[];
};

const repoRoot = process.cwd();

/**
 * リポジトリルートの index.json を読み込む。
 * ビルド時 (SSG) にのみ呼ばれる Server 専用関数。
 */
export function loadIndex(): IndexFile {
  const raw = readFileSync(join(repoRoot, "index.json"), "utf8");
  return JSON.parse(raw) as IndexFile;
}

/** 軸 (jsic / color / mood / tag) ごとの出現数を集計するファセット。 */
export type Facet = { value: string; count: number };

function tally(values: string[]): Facet[] {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export type Facets = {
  jsic: Facet[];
  color: Facet[];
  mood: Facet[];
  tag: Facet[];
};

/** エントリ集合から分類軸ごとのファセットを導出する。 */
export function deriveFacets(entries: Entry[]): Facets {
  return {
    jsic: tally(entries.map((e) => e.jsic)),
    color: tally(entries.map((e) => e.color)),
    mood: tally(entries.map((e) => e.mood)),
    tag: tally(entries.flatMap((e) => e.tags)),
  };
}

// --- DESIGN.md 本文ローダ (SSG 専用) -------------------------------------

/** DESIGN.md 本文の 1 セクション (`## {ja} / {id}` 見出し + 整形済み本文 HTML)。 */
export type DesignSection = {
  /** 安定 ID（見出し末尾の英字。例 `atmosphere`）。 */
  id: string;
  /** 日本語表示名（見出しの `{ja}` 部分）。 */
  ja: string;
  /** 本文 Markdown を marked で HTML 化したもの（ビルド時・信頼済みソース）。 */
  html: string;
};

/** 1 セルの DESIGN.md をパースした結果。 */
export type DesignDoc = {
  /** frontmatter の flat な key/value（配列はインライン）。 */
  frontmatter: Record<string, string | number | string[]>;
  /** H1 見出しのタイトル。 */
  title: string;
  /** 本文 9 セクション（ファイル出現順）。 */
  sections: DesignSection[];
};

/** frontmatter の値: インライン配列 `[a, b]` かスカラ（数値/クォート文字列/裸文字列）。 */
function parseFrontmatterValue(raw: string): string | number | string[] {
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((s) => stripQuotes(s.trim()));
  }
  if (/^-?[0-9]+$/.test(raw)) return Number(raw);
  return stripQuotes(raw);
}

function stripQuotes(s: string): string {
  if (
    s.length >= 2 &&
    ((s[0] === '"' && s.at(-1) === '"') || (s[0] === "'" && s.at(-1) === "'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

/**
 * `entry.path`（design-md/.../DESIGN.md）の本文を読み、frontmatter・H1・
 * 本文 9 セクションへ分解して返す。検証済みのオンディスク形式
 * (documents/schema/design-md.schema.md) に準拠してパースする。
 *
 * 材化されていない（ファイル不在）セルは `null` を返す。呼び出し側は
 * 現状のメタ表示にフォールバックする。ビルド時 (SSG) にのみ呼ばれる。
 */
export function loadDesignDoc(path: string): DesignDoc | null {
  const full = join(repoRoot, path);
  if (!existsSync(full)) return null;

  const src = readFileSync(full, "utf8").replace(/\r\n/g, "\n");
  const lines = src.split("\n");
  if (lines[0] !== "---") return null;

  let fmEnd = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      fmEnd = i;
      break;
    }
  }
  if (fmEnd === -1) return null;

  const frontmatter: Record<string, string | number | string[]> = {};
  for (let i = 1; i < fmEnd; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const m = /^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/.exec(line);
    if (m) frontmatter[m[1]] = parseFrontmatterValue(m[2].trim());
  }

  const body = lines.slice(fmEnd + 1);

  // H1 タイトルと H2 見出し（コードフェンス内は除外）を収集する。
  let title = typeof frontmatter.title === "string" ? frontmatter.title : "";
  const headings: { ja: string; id: string; line: number }[] = [];
  let inFence = false;
  body.forEach((line, i) => {
    if (/^```/.test(line.trim())) inFence = !inFence;
    if (inFence) return;
    const h1 = /^#\s+(.*\S)\s*$/.exec(line);
    if (h1) {
      title = h1[1].trim();
      return;
    }
    const h2 = /^##\s+(.*\S)\s*$/.exec(line);
    if (h2) {
      const text = h2[1].trim();
      const slash = text.lastIndexOf(" / ");
      const ja = slash >= 0 ? text.slice(0, slash).trim() : text;
      const id = slash >= 0 ? text.slice(slash + 3).trim() : text;
      headings.push({ ja, id, line: i });
    }
  });

  const sections: DesignSection[] = headings.map((h, idx) => {
    const start = h.line + 1;
    const stop = idx + 1 < headings.length ? headings[idx + 1].line : body.length;
    const md = body.slice(start, stop).join("\n").trim();
    // ビルド時に信頼済み（自リポジトリ）の Markdown のみを HTML 化する。
    const html = marked.parse(md, { async: false, gfm: true }) as string;
    return { id: h.id, ja: h.ja, html };
  });

  if (sections.length === 0) return null;

  return { frontmatter, title, sections };
}
