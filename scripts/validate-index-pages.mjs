#!/usr/bin/env node
// index/pages/{n}.json をスキーマ + summary/index 整合で検証する。
// ページ未生成時はスキップ終了（exit 0）。契約: documents/spec/index-paging.md / ADR-0003

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { preserveJsonNumber } from "./index-page-json-numbers.mjs";

const PAGE_SIZE = 1000;

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const schemaPath = resolve(root, "documents/schema/index-page.schema.json");
const summaryPath = resolve(root, "index-summary.json");
const indexPath = resolve(root, "index.json");
const pagesDir = resolve(root, "index", "pages");

function readJson(path, reviver) {
  try {
    return JSON.parse(readFileSync(path, "utf8"), reviver);
  } catch (err) {
    console.error(`[validate-index-pages] 読込/パース失敗: ${path}\n  ${err.message}`);
    process.exit(1);
  }
}

if (!existsSync(pagesDir)) {
  console.log(
    "[validate-index-pages] SKIP: index/pages がありません（`pnpm run build:index-summary -- --pages` で生成）",
  );
  process.exit(0);
}

const pageFiles = readdirSync(pagesDir).filter((name) => /^\d+\.json$/.test(name));
if (pageFiles.length === 0) {
  console.log("[validate-index-pages] SKIP: index/pages にページファイルがありません");
  process.exit(0);
}

const schema = readJson(schemaPath);
const summary = readJson(summaryPath);
const index = readJson(indexPath, preserveJsonNumber);
const entries = Array.isArray(index?.entries) ? index.entries : [];

// entries.items は index entry の完全 schema を持たず required のみ
// （オフライン $ref 回避）。strictRequired は無効化する。
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
const validate = ajv.compile(schema);
const errors = [];

const expectedPageCount =
  summary.pageCount ??
  (entries.length === 0 ? 0 : Math.ceil(entries.length / PAGE_SIZE));
const expectedEntryCount = summary.entryCount ?? entries.length;

if (pageFiles.length !== expectedPageCount) {
  errors.push(
    `ページファイル数 (${pageFiles.length}) が summary.pageCount (${expectedPageCount}) と一致しません`,
  );
}

let combined = 0;

for (let page = 0; page < expectedPageCount; page++) {
  const path = resolve(pagesDir, `${page}.json`);
  if (!existsSync(path)) {
    errors.push(`欠落: index/pages/${page}.json`);
    continue;
  }

  const doc = readJson(path, preserveJsonNumber);
  if (!validate(doc)) {
    for (const e of validate.errors ?? []) {
      errors.push(`page ${page} schema: ${e.instancePath || "/"} ${e.message}`);
    }
  }

  if (doc.page !== page) {
    errors.push(`page ${page}: doc.page=${doc.page} がファイル番号と不一致`);
  }
  if (doc.pageSize !== PAGE_SIZE) {
    errors.push(`page ${page}: pageSize は ${PAGE_SIZE} である必要があります`);
  }

  const slice = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  if (doc.entryCount !== slice.length) {
    errors.push(
      `page ${page}: entryCount (${doc.entryCount}) が期待スライス長 (${slice.length}) と不一致`,
    );
  }
  if (!Array.isArray(doc.entries) || doc.entries.length !== slice.length) {
    errors.push(`page ${page}: entries.length がスライス長と不一致`);
  } else {
    // Preserve the first ID diagnostic even if an earlier entry differs.
    const idMismatch = slice.findIndex(
      (entry, i) => doc.entries[i]?.id !== entry?.id,
    );
    if (idMismatch !== -1) {
      const actual = doc.entries[idMismatch]?.id;
      const expected = slice[idMismatch]?.id;
      errors.push(
        `page ${page}: entries[${idMismatch}].id (${actual}) が index 順と不一致 (expected ${expected})`,
      );
    } else {
      const mismatch = slice.findIndex(
        (entry, i) => !isDeepStrictEqual(doc.entries[i], entry),
      );
      if (mismatch !== -1) {
        errors.push(`page ${page}: entries[${mismatch}] が index.json の entry と不一致`);
      }
    }
  }

  if (
    typeof index.generatedAt === "string" &&
    doc.generatedAt !== index.generatedAt
  ) {
    errors.push(
      `page ${page}: generatedAt が index.json generatedAt と不一致`,
    );
  }

  combined += Array.isArray(doc.entries) ? doc.entries.length : 0;
}

if (combined !== expectedEntryCount) {
  errors.push(
    `全ページ結合 entryCount (${combined}) が summary.entryCount (${expectedEntryCount}) と不一致`,
  );
}

if (errors.length > 0) {
  console.error("[validate-index-pages] 検証失敗:");
  for (const msg of errors) console.error(`  - ${msg}`);
  process.exit(1);
}

console.log(
  `[validate-index-pages] OK: pages=${expectedPageCount}, combinedEntryCount=${combined}, pageSize=${PAGE_SIZE}`,
);
