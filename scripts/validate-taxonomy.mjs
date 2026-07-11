#!/usr/bin/env node
// taxonomy.json を JSON Schema (documents/schema/taxonomy.schema.json) で検証する。
// さらに、index.json で実際に使われている全 color/mood slug が taxonomy.json に
// 存在すること (Matrix Pages 日本語化の契約) を追加検証する。
// CI (.github/workflows/ci.yml) から `pnpm run validate` 経由で実行される。

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const schemaPath = resolve(root, "documents/schema/taxonomy.schema.json");
const taxonomyPath = resolve(root, "taxonomy.json");
const indexPath = resolve(root, "index.json");

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`[validate-taxonomy] 読込/パース失敗: ${path}\n  ${err.message}`);
    process.exit(1);
  }
}

const schema = readJson(schemaPath);
const taxonomy = readJson(taxonomyPath);
const index = readJson(indexPath);

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const validate = ajv.compile(schema);
const errors = [];

if (!validate(taxonomy)) {
  for (const e of validate.errors ?? []) {
    errors.push(`schema: ${e.instancePath || "/"} ${e.message}`);
  }
}

// --- index.json との相互検証: 実使用の全 color/mood が taxonomy に存在すること ---
const colors = taxonomy?.colors ?? {};
const moods = taxonomy?.moods ?? {};
const entries = Array.isArray(index?.entries) ? index.entries : [];

const missingColors = new Set();
const missingMoods = new Set();
for (const entry of entries) {
  const { color, mood } = entry ?? {};
  if (color && !Object.prototype.hasOwnProperty.call(colors, color)) missingColors.add(color);
  if (mood && !Object.prototype.hasOwnProperty.call(moods, mood)) missingMoods.add(mood);
}

for (const c of [...missingColors].sort()) {
  errors.push(`index.json の color "${c}" が taxonomy.json (colors) に存在しません`);
}
for (const m of [...missingMoods].sort()) {
  errors.push(`index.json の mood "${m}" が taxonomy.json (moods) に存在しません`);
}

if (errors.length > 0) {
  console.error("[validate-taxonomy] 検証失敗:");
  for (const msg of errors) console.error(`  - ${msg}`);
  process.exit(1);
}

const usedColors = new Set(entries.map((e) => e?.color).filter(Boolean));
const usedMoods = new Set(entries.map((e) => e?.mood).filter(Boolean));
console.log(
  `[validate-taxonomy] OK: colors ${Object.keys(colors).length} 件 (index 実使用 ${usedColors.size} を全カバー), ` +
    `moods ${Object.keys(moods).length} 件 (index 実使用 ${usedMoods.size} を全カバー), schema + 相互検証通過`,
);
