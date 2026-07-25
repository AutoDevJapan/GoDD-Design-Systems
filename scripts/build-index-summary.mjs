#!/usr/bin/env node
// index.json から index-summary.json を決定論生成する。
// --pages を付けると index/pages/{n}.json も書き出す（巨大のため既定では出さない）。
// 契約: documents/spec/index-paging.md / documents/adr/0001-index-summary-paging.md

import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PAGE_SIZE = 1000;
const SUMMARY_VERSION = 1;
const PAGE_VERSION = 1;

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const indexPath = resolve(root, "index.json");
const summaryPath = resolve(root, "index-summary.json");
const pagesDir = resolve(root, "index", "pages");

const writePages = process.argv.includes("--pages");

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`[build-index-summary] 読込/パース失敗: ${path}\n  ${err.message}`);
    process.exit(1);
  }
}

function tally(values) {
  const map = new Map();
  for (const v of values) {
    if (typeof v !== "string" || v.length === 0) continue;
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

const index = readJson(indexPath);
const entries = Array.isArray(index?.entries) ? index.entries : null;
if (!entries) {
  console.error("[build-index-summary] index.json に entries 配列がありません");
  process.exit(1);
}

const entryCount = entries.length;
const pageCount = entryCount === 0 ? 0 : Math.ceil(entryCount / PAGE_SIZE);
const now = new Date().toISOString();
const sourceGeneratedAt =
  typeof index.generatedAt === "string" && index.generatedAt.length > 0
    ? index.generatedAt
    : now;

const summary = {
  $schema:
    "https://raw.githubusercontent.com/AutoDevJapan/GoDD-Design-Systems/main/documents/schema/index-summary.schema.json",
  version: SUMMARY_VERSION,
  generatedAt: now,
  sourceGeneratedAt,
  entryCount,
  pageSize: PAGE_SIZE,
  pageCount,
  facets: {
    jsic: tally(entries.map((e) => e.jsic)),
    color: tally(entries.map((e) => e.color)),
    mood: tally(entries.map((e) => e.mood)),
    tag: tally(entries.flatMap((e) => (Array.isArray(e.tags) ? e.tags : []))),
  },
};

writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(
  `[build-index-summary] wrote ${summaryPath} (entryCount=${entryCount}, pageCount=${pageCount}, pageSize=${PAGE_SIZE})`,
);

if (!writePages) {
  console.log("[build-index-summary] pages 省略（必要なら --pages）");
  process.exit(0);
}

rmSync(pagesDir, { recursive: true, force: true });
mkdirSync(pagesDir, { recursive: true });

for (let page = 0; page < pageCount; page++) {
  const slice = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageDoc = {
    $schema:
      "https://raw.githubusercontent.com/AutoDevJapan/GoDD-Design-Systems/main/documents/schema/index-page.schema.json",
    version: PAGE_VERSION,
    page,
    pageSize: PAGE_SIZE,
    entryCount: slice.length,
    generatedAt: now,
    entries: slice,
  };
  const out = resolve(pagesDir, `${page}.json`);
  writeFileSync(out, `${JSON.stringify(pageDoc)}\n`, "utf8");
}

console.log(`[build-index-summary] wrote ${pageCount} pages under ${pagesDir}`);
