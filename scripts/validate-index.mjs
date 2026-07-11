#!/usr/bin/env node
// index.json を JSON Schema (documents/schema/index.schema.json) で検証する。
// スキーマ単体では表現しにくい整合性 (id 一意性・id/path と jsic/color/mood の一致) も追加検証する。
// CI (.github/workflows/ci.yml) から `npm run validate` 経由で実行される。

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const schemaPath = resolve(root, "documents/schema/index.schema.json");
const dataPath = resolve(root, "index.json");

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`[validate-index] 読込/パース失敗: ${path}\n  ${err.message}`);
    process.exit(1);
  }
}

const schema = readJson(schemaPath);
const data = readJson(dataPath);

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

// $schema は JSON Schema メタスキーマ参照であり、データ側の $schema (自己参照) は検証対象外にする。
const validate = ajv.compile(schema);
const errors = [];

if (!validate(data)) {
  for (const e of validate.errors ?? []) {
    errors.push(`schema: ${e.instancePath || "/"} ${e.message}`);
  }
}

// --- スキーマ外の整合性チェック ---
const entries = Array.isArray(data?.entries) ? data.entries : [];
const seenIds = new Set();

entries.forEach((entry, i) => {
  const at = `entries[${i}]`;
  const { id, path, jsic, color, mood } = entry ?? {};
  if (typeof id === "string") {
    if (seenIds.has(id)) errors.push(`${at}: id が重複しています: "${id}"`);
    seenIds.add(id);
  }
  // id は `{jsic}_{color}_{mood}` と一致する必要がある。
  if (jsic && color && mood) {
    const expectedId = `${jsic}_${color}_${mood}`;
    if (id !== expectedId) {
      errors.push(`${at}: id "${id}" が jsic/color/mood から導かれる "${expectedId}" と一致しません`);
    }
    const expectedPath = `design-md/${jsic}/${color}/${mood}/DESIGN.md`;
    if (path !== expectedPath) {
      errors.push(`${at}: path "${path}" が期待値 "${expectedPath}" と一致しません`);
    }
  }
});

if (errors.length > 0) {
  console.error("[validate-index] 検証失敗:");
  for (const msg of errors) console.error(`  - ${msg}`);
  process.exit(1);
}

console.log(`[validate-index] OK: ${entries.length} entries, schema + 整合性チェック通過`);
