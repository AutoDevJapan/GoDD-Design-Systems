#!/usr/bin/env node
// index-summary.json をスキーマ検証し、index.json との件数・ファセット整合を確認する。

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const PAGE_SIZE = 1000;

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const schemaPath = resolve(root, "documents/schema/index-summary.schema.json");
const summaryPath = resolve(root, "index-summary.json");
const indexPath = resolve(root, "index.json");

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`[validate-index-summary] 読込/パース失敗: ${path}\n  ${err.message}`);
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

function facetsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].value !== b[i].value || a[i].count !== b[i].count) return false;
  }
  return true;
}

const schema = readJson(schemaPath);
const summary = readJson(summaryPath);
const index = readJson(indexPath);
const entries = Array.isArray(index?.entries) ? index.entries : [];

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const errors = [];

if (!validate(summary)) {
  for (const e of validate.errors ?? []) {
    errors.push(`schema: ${e.instancePath || "/"} ${e.message}`);
  }
}

if (summary.pageSize !== PAGE_SIZE) {
  errors.push(`pageSize は ${PAGE_SIZE} である必要があります (got ${summary.pageSize})`);
}

const expectedCount = entries.length;
if (summary.entryCount !== expectedCount) {
  errors.push(
    `entryCount (${summary.entryCount}) が index.json entries.length (${expectedCount}) と一致しません`,
  );
}

const expectedPageCount =
  expectedCount === 0 ? 0 : Math.ceil(expectedCount / PAGE_SIZE);
if (summary.pageCount !== expectedPageCount) {
  errors.push(
    `pageCount (${summary.pageCount}) が期待値 ${expectedPageCount} と一致しません`,
  );
}

if (
  typeof index.generatedAt === "string" &&
  summary.sourceGeneratedAt !== index.generatedAt
) {
  errors.push(
    `sourceGeneratedAt (${summary.sourceGeneratedAt}) が index.json generatedAt (${index.generatedAt}) と一致しません`,
  );
}

const expectedFacets = {
  jsic: tally(entries.map((e) => e.jsic)),
  color: tally(entries.map((e) => e.color)),
  mood: tally(entries.map((e) => e.mood)),
  tag: tally(entries.flatMap((e) => (Array.isArray(e.tags) ? e.tags : []))),
};

for (const axis of ["jsic", "color", "mood", "tag"]) {
  if (!facetsEqual(summary.facets?.[axis], expectedFacets[axis])) {
    errors.push(`facets.${axis} が index.json から再集計した値と一致しません`);
  }
}

// ページ境界の契約スモーク（ファイルを書かずメモリ上で確認）
if (expectedPageCount > 0) {
  const lastPage = expectedPageCount - 1;
  const lastLen = expectedCount - lastPage * PAGE_SIZE;
  if (lastLen < 1 || lastLen > PAGE_SIZE) {
    errors.push(`最終ページ長 ${lastLen} が 1..${PAGE_SIZE} の範囲外です`);
  }
  if (expectedPageCount > 1 && lastPage * PAGE_SIZE !== expectedCount - lastLen) {
    errors.push("ページオフセット計算が不整合です");
  }
}

if (errors.length > 0) {
  console.error("[validate-index-summary] 検証失敗:");
  for (const msg of errors) console.error(`  - ${msg}`);
  process.exit(1);
}

console.log(
  `[validate-index-summary] OK: entryCount=${summary.entryCount}, pageCount=${summary.pageCount}, pageSize=${summary.pageSize}`,
);
