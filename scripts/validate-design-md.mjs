#!/usr/bin/env node
// design-md/**/DESIGN.md を検証する。
//   1. frontmatter を JSON Schema (documents/schema/design-md.schema.json) で検証。
//   2. 本文 9 セクション (H2 見出し) の存在・順序・非空を検証。
//   3. パス・index.json との整合 (id/title/軸/tags/path/hash) を検証。
// 仕様: documents/schema/design-md.schema.md。CI (schema ジョブ) から `pnpm run validate` 経由で実行。

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { DESIGN_MD_SECTIONS, sectionHeading } from "./design-md-sections.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const schemaPath = resolve(root, "documents/schema/design-md.schema.json");
const indexPath = resolve(root, "index.json");
const designRoot = resolve(root, "design-md");

const errors = [];
function fail(msg) {
  errors.push(msg);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`[validate-design-md] 読込/パース失敗: ${path}\n  ${err.message}`);
    process.exit(1);
  }
}

/** design-md 配下の DESIGN.md を再帰列挙 (リポジトリ相対 POSIX パス)。 */
function findDesignFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...findDesignFiles(full));
    else if (name === "DESIGN.md") out.push(relative(root, full).split("\\").join("/"));
  }
  return out;
}

/** ファイル内容の SHA-256 (LF 正規化)。形式 `sha256:{hex}`。 */
function contentHash(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  return "sha256:" + createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * DESIGN.md を frontmatter・H1・本文に分解する。
 * frontmatter は先頭 `---` 〜 次の `---`。flat な `key: value` のみ許可。
 */
function parseDesignMd(text) {
  const src = text.replace(/\r\n/g, "\n");
  const lines = src.split("\n");
  if (lines[0] !== "---") {
    return { error: "先頭行が frontmatter 区切り '---' ではありません" };
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return { error: "frontmatter の終端 '---' が見つかりません" };

  const fm = {};
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const m = /^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/.exec(line);
    if (!m) return { error: `frontmatter の行を解釈できません (flat な 'key: value' のみ許可): "${line}"` };
    const key = m[1];
    const raw = m[2].trim();
    fm[key] = parseScalarOrArray(raw);
  }

  const body = lines.slice(end + 1);
  return { frontmatter: fm, bodyLines: body };
}

/** frontmatter の値: インライン配列 `[a, b]` かスカラ (数値/クォート文字列/裸文字列)。 */
function parseScalarOrArray(raw) {
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((s) => stripQuotes(s.trim()));
  }
  if (/^-?[0-9]+$/.test(raw)) return Number(raw);
  return stripQuotes(raw);
}

function stripQuotes(s) {
  if (s.length >= 2 && ((s[0] === '"' && s.at(-1) === '"') || (s[0] === "'" && s.at(-1) === "'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/** 本文の H2 見出しセクション構造を検証する。 */
function validateSections(bodyLines, at) {
  // `## ...` の見出しを順に収集 (コードフェンス内は除外)。
  const headings = [];
  let inFence = false;
  bodyLines.forEach((line, i) => {
    if (/^```/.test(line.trim())) inFence = !inFence;
    if (inFence) return;
    const m = /^##\s+(.*\S)\s*$/.exec(line);
    if (m) headings.push({ text: m[1].trim(), line: i });
  });

  const expected = DESIGN_MD_SECTIONS.map(sectionHeading);
  const actual = headings.map((h) => h.text);

  // 順序と一致 (過不足・順序違いを検出)。
  if (actual.length !== expected.length || actual.some((t, i) => t !== expected[i])) {
    fail(
      `${at}: H2 セクション見出しが規定と一致しません。\n` +
        `    期待 (順): ${expected.map((e) => `"## ${e}"`).join(", ")}\n` +
        `    実際 (順): ${actual.map((a) => `"## ${a}"`).join(", ") || "(なし)"}`,
    );
    return;
  }

  // 各セクション本文が非空であること。
  for (let s = 0; s < headings.length; s++) {
    const start = headings[s].line + 1;
    const stop = s + 1 < headings.length ? headings[s + 1].line : bodyLines.length;
    const hasContent = bodyLines.slice(start, stop).some((l) => l.trim() !== "");
    if (!hasContent) fail(`${at}: セクション "## ${actual[s]}" の本文が空です`);
  }
}

// --- メイン ---------------------------------------------------------------

const schema = readJson(schemaPath);
const index = readJson(indexPath);
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateFrontmatter = ajv.compile(schema);

const indexByPath = new Map();
for (const e of Array.isArray(index?.entries) ? index.entries : []) {
  if (e && typeof e.path === "string") indexByPath.set(e.path, e);
}

const files = findDesignFiles(designRoot).sort();
const seenPaths = new Set();

for (const relPath of files) {
  const at = relPath;
  seenPaths.add(relPath);
  const text = readFileSync(resolve(root, relPath), "utf8");
  const parsed = parseDesignMd(text);
  if (parsed.error) {
    fail(`${at}: ${parsed.error}`);
    continue;
  }

  const fm = parsed.frontmatter;

  // 1. frontmatter スキーマ検証。
  if (!validateFrontmatter(fm)) {
    for (const e of validateFrontmatter.errors ?? []) {
      fail(`${at}: frontmatter ${e.instancePath || "/"} ${e.message}`);
    }
  }

  // 2. 本文セクション構造。
  validateSections(parsed.bodyLines, at);

  // 3. パス整合。
  if (fm.jsic && fm.color && fm.mood) {
    const expectedPath = `design-md/${fm.jsic}/${fm.color}/${fm.mood}/DESIGN.md`;
    if (relPath !== expectedPath) {
      fail(`${at}: パスが frontmatter から導かれる "${expectedPath}" と一致しません`);
    }
    const expectedId = `${fm.jsic}_${fm.color}_${fm.mood}`;
    if (fm.id !== expectedId) {
      fail(`${at}: id "${fm.id}" が jsic/color/mood から導かれる "${expectedId}" と一致しません`);
    }
  }

  // 4-5. index.json との整合 + hash。
  const entry = indexByPath.get(relPath);
  if (!entry) {
    fail(`${at}: 対応する index.json エントリ (path 一致) が存在しません`);
  } else {
    for (const key of ["id", "title", "jsic", "color", "mood"]) {
      if (fm[key] !== undefined && fm[key] !== entry[key]) {
        fail(`${at}: frontmatter.${key} ("${fm[key]}") が index.json ("${entry[key]}") と一致しません`);
      }
    }
    const fmTags = Array.isArray(fm.tags) ? fm.tags : [];
    const idxTags = Array.isArray(entry.tags) ? entry.tags : [];
    if (JSON.stringify(fmTags) !== JSON.stringify(idxTags)) {
      fail(`${at}: frontmatter.tags [${fmTags}] が index.json [${idxTags}] と一致しません`);
    }
    const actualHash = contentHash(text);
    if (entry.hash !== actualHash) {
      fail(`${at}: index.json の hash が実ファイル内容と一致しません\n    index: ${entry.hash}\n    実際 : ${actualHash}`);
    }
  }
}

// 6. index の全エントリにファイルが存在すること。
for (const [p] of indexByPath) {
  if (!seenPaths.has(p)) fail(`index.json: path "${p}" の DESIGN.md ファイルが存在しません`);
}

if (errors.length > 0) {
  console.error("[validate-design-md] 検証失敗:");
  for (const msg of errors) console.error(`  - ${msg}`);
  process.exit(1);
}

console.log(`[validate-design-md] OK: ${files.length} 件の DESIGN.md, frontmatter + セクション + index 整合 通過`);
