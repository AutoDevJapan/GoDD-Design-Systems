#!/usr/bin/env node
// jsic.json を検証する。
//   1. JSON Schema (documents/schema/jsic.schema.json) で構造検証。
//   2. スキーマ外の整合性: code 重複なし・親子参照の存在と一貫性・code 接頭辞の一致。
//   3. meta.ingested の件数が実配列長と一致し official 以下であること。
//   4. index.json の jsic 値がすべて jsic.json の細分類 (subclass) に存在すること (相互検証)。
// CI (.github/workflows/ci.yml の schema ジョブ) から `pnpm run validate:jsic` 経由で実行される。

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const schemaPath = resolve(root, "documents/schema/jsic.schema.json");
const dataPath = resolve(root, "jsic.json");
const indexPath = resolve(root, "index.json");

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`[validate-jsic] 読込/パース失敗: ${path}\n  ${err.message}`);
    process.exit(1);
  }
}

const schema = readJson(schemaPath);
const data = readJson(dataPath);
const index = readJson(indexPath);

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const validate = ajv.compile(schema);
const errors = [];

if (!validate(data)) {
  for (const e of validate.errors ?? []) {
    errors.push(`schema: ${e.instancePath || "/"} ${e.message}`);
  }
}

// --- スキーマ外の整合性チェック ---
const major = Array.isArray(data?.major) ? data.major : [];
const middle = Array.isArray(data?.middle) ? data.middle : [];
const minor = Array.isArray(data?.minor) ? data.minor : [];
const subclass = Array.isArray(data?.subclass) ? data.subclass : [];

/** code 重複を検出し、code→item の Map を返す。 */
function indexByCode(items, level) {
  const map = new Map();
  for (const it of items) {
    const code = it?.code;
    if (typeof code !== "string") continue;
    if (map.has(code)) errors.push(`${level}: code が重複しています: "${code}"`);
    map.set(code, it);
  }
  return map;
}

const majorMap = indexByCode(major, "major");
const middleMap = indexByCode(middle, "middle");
const minorMap = indexByCode(minor, "minor");
const subclassMap = indexByCode(subclass, "subclass");

// 中分類: major 参照の存在。
for (const m of middle) {
  if (m?.major && !majorMap.has(m.major)) {
    errors.push(`middle[${m.code}]: 親 major "${m.major}" が存在しません`);
  }
}

// 小分類: middle 参照の存在・major 一貫性・code 接頭辞。
for (const m of minor) {
  const parent = m?.middle ? middleMap.get(m.middle) : undefined;
  if (m?.middle && !parent) {
    errors.push(`minor[${m.code}]: 親 middle "${m.middle}" が存在しません`);
  } else if (parent && m.major !== parent.major) {
    errors.push(`minor[${m.code}]: major "${m.major}" が親 middle "${m.middle}" の major "${parent.major}" と一致しません`);
  }
  if (typeof m?.code === "string" && typeof m?.middle === "string" && !m.code.startsWith(m.middle)) {
    errors.push(`minor[${m.code}]: code が middle "${m.middle}" で始まっていません`);
  }
}

// 細分類: minor 参照の存在・middle/major 一貫性・code 接頭辞。
for (const s of subclass) {
  const parent = s?.minor ? minorMap.get(s.minor) : undefined;
  if (s?.minor && !parent) {
    errors.push(`subclass[${s.code}]: 親 minor "${s.minor}" が存在しません`);
  } else if (parent) {
    if (s.middle !== parent.middle) {
      errors.push(`subclass[${s.code}]: middle "${s.middle}" が親 minor "${s.minor}" の middle "${parent.middle}" と一致しません`);
    }
    if (s.major !== parent.major) {
      errors.push(`subclass[${s.code}]: major "${s.major}" が親 minor "${s.minor}" の major "${parent.major}" と一致しません`);
    }
  }
  if (typeof s?.code === "string" && typeof s?.minor === "string" && !s.code.startsWith(s.minor)) {
    errors.push(`subclass[${s.code}]: code が minor "${s.minor}" で始まっていません`);
  }
}

// meta.ingested の件数一致 + official 以下。
const meta = data?.meta ?? {};
const actualCounts = { major: major.length, middle: middle.length, minor: minor.length, subclass: subclass.length };
for (const level of ["major", "middle", "minor", "subclass"]) {
  const declared = meta?.ingested?.[level];
  if (declared !== actualCounts[level]) {
    errors.push(`meta.ingested.${level} (${declared}) が実配列長 (${actualCounts[level]}) と一致しません`);
  }
  const official = meta?.official?.[level];
  if (typeof official === "number" && actualCounts[level] > official) {
    errors.push(`${level} の収録数 (${actualCounts[level]}) が official (${official}) を超えています`);
  }
}

// index.json の jsic 値が細分類に存在すること (相互検証)。
const indexEntries = Array.isArray(index?.entries) ? index.entries : [];
for (let i = 0; i < indexEntries.length; i++) {
  const jsic = indexEntries[i]?.jsic;
  if (typeof jsic === "string" && !subclassMap.has(jsic)) {
    errors.push(`index.json entries[${i}]: jsic "${jsic}" が jsic.json の細分類 (subclass) に存在しません`);
  }
}

if (errors.length > 0) {
  console.error("[validate-jsic] 検証失敗:");
  for (const msg of errors) console.error(`  - ${msg}`);
  process.exit(1);
}

console.log(
  `[validate-jsic] OK: 大分類 ${major.length} / 中分類 ${middle.length} / 小分類 ${minor.length} / 細分類 ${subclass.length}` +
    ` (official 20/99/536/1473, completeness=${meta?.completeness}), schema + 整合性 + index 相互検証 通過`,
);
