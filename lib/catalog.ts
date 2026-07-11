import { readFileSync } from "node:fs";
import { join } from "node:path";

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
