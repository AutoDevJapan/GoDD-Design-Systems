#!/usr/bin/env node
// index/pages を Release 配布用にステージングする（zip は CI の zip(1) に委譲）。
// 契約: documents/adr/0003-index-pages-release-publish.md

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RELEASE_TAG = "index-pages";
const PAGES_BASE_URL =
  "https://github.com/AutoDevJapan/GoDD-Design-Systems/releases/download/index-pages/";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const pagesDir = resolve(root, "index", "pages");
const summaryPath = resolve(root, "index-summary.json");
const outDir = resolve(root, "dist", "index-pages-release");
const stagedPagesDir = resolve(outDir, "index", "pages");

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`[package-index-pages] 読込/パース失敗: ${path}\n  ${err.message}`);
    process.exit(1);
  }
}

if (!existsSync(pagesDir)) {
  console.error(
    "[package-index-pages] index/pages がありません。先に `pnpm run build:index-summary -- --pages` を実行してください",
  );
  process.exit(1);
}

const summary = readJson(summaryPath);
const pageCount = summary.pageCount;
const entryCount = summary.entryCount;
const pageSize = summary.pageSize;
const generatedAt = summary.generatedAt;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(stagedPagesDir, { recursive: true });
cpSync(pagesDir, stagedPagesDir, { recursive: true });

// Release 直下に置く個別アセット用コピー（パス短縮）
for (let page = 0; page < pageCount; page++) {
  const src = resolve(pagesDir, `${page}.json`);
  if (!existsSync(src)) {
    console.error(`[package-index-pages] 欠落: ${src}`);
    process.exit(1);
  }
  cpSync(src, resolve(outDir, `${page}.json`));
}

const manifest = {
  version: 1,
  releaseTag: RELEASE_TAG,
  generatedAt,
  sourceGeneratedAt: summary.sourceGeneratedAt,
  entryCount,
  pageSize,
  pageCount,
  pagesBaseUrl: PAGES_BASE_URL,
  zipAsset: "index-pages.zip",
  zipInnerPath: "index/pages/{n}.json",
  pageAssetPattern: "{n}.json",
};

writeFileSync(
  resolve(outDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(
  `[package-index-pages] staged ${outDir} (pageCount=${pageCount}, entryCount=${entryCount})`,
);
console.log(
  `[package-index-pages] zip 手順 (CI): cd dist/index-pages-release && zip -r ../../index-pages.zip index`,
);
console.log(`[package-index-pages] pagesBaseUrl=${PAGES_BASE_URL}`);
