#!/usr/bin/env node
// jsic.json 取込パイプライン (再現可能なビルド)。
//
// 目的:
//   - 収録済みデータ (大/中/小/細分類) を決定的に整列し、
//   - meta.ingested の件数を実配列長から再計算し、
//   - 任意の外部ソース (documents/data/jsic-source.json) を取り込んで細分類を拡張する。
//
// 全 1,473 細分類の取込手順 (出典: 総務省 / e-Stat):
//   1. e-Stat 分類検索 (令和5年改定, revision=04) から分類項目をダウンロードする。
//      一覧・ダウンロード: https://www.e-stat.go.jp/classifications/terms/10
//      個別項目 (例 6061): https://www.e-stat.go.jp/classifications/terms/10/04/6061
//      告示原本 (PDF):     https://www.soumu.go.jp/main_content/000941216.pdf
//   2. 取得結果を documents/data/jsic-source.json に
//        { "minor": [...], "subclass": [...] } 形式 (jsic.schema.json の項目形状) で保存する。
//   3. `pnpm run build:jsic` を実行すると本スクリプトが既存データへマージ (code をキーに upsert) し、
//      整列・件数再計算のうえ jsic.json を書き戻す。
//   4. `pnpm run validate:jsic` でスキーマ・親子整合・index 相互検証を通す。
//
// 使い方:
//   node scripts/build-jsic.mjs           # 整列 + meta.ingested 再計算 (+ ソースがあればマージ) して書き戻す
//   node scripts/build-jsic.mjs --check   # 書き戻さず、正規形と差分があれば非ゼロ終了 (CI/冪等性確認用)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const dataPath = resolve(root, "jsic.json");
const sourcePath = resolve(root, "documents/data/jsic-source.json");
const checkMode = process.argv.includes("--check");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const data = readJson(dataPath);

/** code をキーに items を upsert (ソース側が優先)。 */
function upsertByCode(base, incoming) {
  const map = new Map(base.map((it) => [it.code, it]));
  for (const it of incoming) map.set(it.code, { ...map.get(it.code), ...it });
  return [...map.values()];
}

// 任意の外部ソースをマージ (細分類・小分類の拡張)。
if (existsSync(sourcePath)) {
  const src = readJson(sourcePath);
  for (const level of ["major", "middle", "minor", "subclass"]) {
    if (Array.isArray(src?.[level])) {
      data[level] = upsertByCode(Array.isArray(data[level]) ? data[level] : [], src[level]);
    }
  }
  console.log(`[build-jsic] 外部ソースをマージ: ${sourcePath}`);
}

// 決定的に整列 (major は A〜T、その他は数値 code 昇順)。
const byCode = (a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
for (const level of ["major", "middle", "minor", "subclass"]) {
  if (Array.isArray(data[level])) data[level].sort(byCode);
}

// meta.ingested を実配列長から再計算。
data.meta = data.meta ?? {};
data.meta.ingested = {
  major: data.major?.length ?? 0,
  middle: data.middle?.length ?? 0,
  minor: data.minor?.length ?? 0,
  subclass: data.subclass?.length ?? 0,
};

const output = JSON.stringify(data, null, 2) + "\n";
const current = readFileSync(dataPath, "utf8");

if (checkMode) {
  if (output !== current) {
    console.error("[build-jsic] jsic.json が正規形ではありません。`pnpm run build:jsic` を実行してください。");
    process.exit(1);
  }
  console.log("[build-jsic] OK: jsic.json は正規形です。");
} else {
  if (output !== current) {
    writeFileSync(dataPath, output, "utf8");
    console.log("[build-jsic] jsic.json を更新しました。");
  } else {
    console.log("[build-jsic] 変更なし (既に正規形)。");
  }
  console.log(
    `[build-jsic] 収録: 大 ${data.meta.ingested.major} / 中 ${data.meta.ingested.middle} / 小 ${data.meta.ingested.minor} / 細 ${data.meta.ingested.subclass}`,
  );
}
