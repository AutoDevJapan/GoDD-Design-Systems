#!/usr/bin/env node
// 法務チェック (SSOT §8「法務チェックリスト」の CI 化)。
//   1. de-brand: DESIGN.md / taxonomy.md / index.json に他社ブランド名・トレードドレス・
//                商標書体名が混入していないか検出する。
//   2. font-open: DESIGN.md のタイポグラフィで参照する書体が、既知のオープンライセンス
//                (SIL OFL / Apache 等) 書体のみであることを検証する (未知の書体は要確認で失敗)。
//   3. attribution: LICENSE(MIT) / README / NOTICE が存在し、必要な出典
//                (e-Stat / 総務省 / PCCS / JIS) が NOTICE に明記されていることを検証する。
//   4. jsic 出典: jsic.json に meta.source.urls が記載されていることを検証する。
// CI (.github/workflows/ci.yml) の schema ジョブに step として統合される (新 required context は増やさない)。

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const violations = [];
const add = (file, msg) => violations.push(`${file}: ${msg}`);

// --- 対象ファイル収集 ---------------------------------------------------------
// design-md 配下の DESIGN.md を再帰列挙 (validate-design-md.mjs と同方式・追加依存なし)。
function designMdFiles(dir = resolve(root, "design-md")) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...designMdFiles(full));
    else if (name === "DESIGN.md") out.push(full);
  }
  return out;
}

function read(path) {
  return readFileSync(path, "utf8");
}
const rel = (p) => relative(root, p).replaceAll("\\", "/");

// --- 1. de-brand: ブランド / トレードドレス denylist -------------------------
// 語境界 (\b) で照合。デザインコーパスに出現する蓋然性が低く、かつ識別性の高い語のみ。
// 網羅ではなく「明白な混入」を止めるためのガード。増補は歓迎。
const BRAND_DENY = [
  "apple", "iphone", "ipad", "macos", "ios",
  "google", "android", "gmail", "youtube", "chrome",
  "microsoft", "windows", "azure", "office365",
  "amazon", "aws", "netflix",
  "facebook", "instagram", "whatsapp", "messenger",
  "twitter", "tiktok", "linkedin", "pinterest", "snapchat",
  "nike", "adidas", "puma", "gucci", "prada", "chanel", "rolex",
  "coca-cola", "coca cola", "pepsi", "starbucks", "mcdonald",
  "spotify", "airbnb", "uber", "lyft", "tesla",
  "slack", "notion", "figma", "adobe", "photoshop", "illustrator",
  "samsung", "galaxy", "sony", "playstation", "nintendo",
  "toyota", "honda", "bmw", "mercedes", "ferrari",
  "disney", "pixar", "marvel", "nintendo switch",
  "shopify", "salesforce", "oracle", "ibm watson",
];

// --- 商標 / 非オープンライセンス書体 denylist --------------------------------
// 識別性の高い書体名のみを全文照合 (impact / times / georgia 等の一般語は誤検出回避のため除外)。
const FONT_DENY = [
  "helvetica", "helvetica neue", "neue helvetica",
  "frutiger", "futura", "univers", "avenir", "avenir next",
  "gotham", "proxima nova", "myriad", "myriad pro",
  "gill sans", "akzidenz", "din next", "din pro",
  "segoe ui", "segoe", "calibri", "cambria", "candara",
  "consolas", "corbel", "constantia", "tahoma", "trebuchet ms",
  "comic sans", "franklin gothic", "century gothic",
  "book antiqua", "adobe garamond", "itc garamond",
  "sf pro", "sf mono", "sf pro display", "sf pro text",
  "circular std", "graphik", "gt walsheim", "brandon grotesque",
  "sofia pro", "gilroy", "trade gothic", "interstate", "whitney",
  "knockout", "sentinel", "archer", "tungsten", "chronicle",
  "hoefler", "neue haas grotesk", "monotype",
  // 商用和文書体 (商標)
  "ヒラギノ", "hiragino", "游ゴシック", "游明朝", "yu gothic", "yu mincho",
  "メイリオ", "meiryo", "小塚", "kozuka", "モリサワ", "morisawa",
  "ゴシックmb101", "リュウミン", "ryumin", "新ゴ", "見出ゴ",
];

function scanDenylist(text, list) {
  const found = new Set();
  const lower = text.toLowerCase();
  for (const term of list) {
    // 英数字トークンは語境界照合、日本語トークンは部分一致 (\b は非 ASCII 境界で機能しないため)。
    const isAscii = /^[\x00-\x7f]+$/.test(term);
    if (isAscii) {
      const re = new RegExp(`(^|[^a-z0-9])${escapeRe(term)}([^a-z0-9]|$)`, "i");
      if (re.test(lower)) found.add(term);
    } else if (lower.includes(term.toLowerCase())) {
      found.add(term);
    }
  }
  return [...found];
}
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- 2. オープンライセンス書体 allowlist -------------------------------------
const OPEN_FONTS = new Set(
  [
    // 汎用ファミリ / システム
    "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace",
    "sans-serif", "serif", "monospace", "-apple-system",
    // 欧文 (SIL OFL / Apache 等)
    "inter", "roboto", "roboto slab", "roboto mono", "roboto condensed",
    "open sans", "lato", "montserrat", "work sans", "public sans",
    "nunito", "nunito sans", "poppins", "raleway", "mulish", "manrope",
    "dm sans", "dm serif display", "space grotesk", "space mono",
    "libre franklin", "libre baskerville", "pt sans", "pt serif",
    "cabin", "oswald", "bitter", "arvo", "quicksand", "josefin sans",
    "hind", "barlow", "archivo", "spectral", "sora", "epilogue",
    "figtree", "plus jakarta sans", "karla", "rubik", "fira sans",
    "fira code", "fira mono", "jetbrains mono", "lora", "merriweather",
    "playfair display", "eb garamond", "crimson pro", "crimson text",
    "source sans 3", "source sans pro", "source serif 4",
    "source serif pro", "source code pro", "source han sans",
    "source han serif",
    "ibm plex sans", "ibm plex serif", "ibm plex mono", "ibm plex sans jp",
    // 和文 (SIL OFL 等)
    "noto sans", "noto serif", "noto sans jp", "noto serif jp",
    "noto sans mono", "noto sans cjk jp", "noto serif cjk jp",
    "m plus 1", "m plus 1p", "m plus 2", "m plus rounded 1c",
    "kosugi", "kosugi maru", "sawarabi gothic", "sawarabi mincho",
    "kaisei tokumin", "kaisei decol", "shippori mincho", "shippori gothic",
    "klee one", "zen kaku gothic new", "zen maru gothic", "zen old mincho",
    "zen antique", "biz udpgothic", "biz udpmincho", "biz udgothic",
    "biz udmincho", "dotgothic16", "dela gothic one", "murecho",
    "yuji syuku", "mochiy pop one", "rampart one", "reggae one",
    "stick", "train one", "yusei magic", "hachi maru pop",
  ].map((s) => s.toLowerCase())
);

// 書体宣言行 (太字ラベルが「…フォント」で終わる行) の backtick トークンを書体候補として抽出する。
// 例: `- **見出しフォント**: \`Inter\` / \`Noto Sans JP\``
// 一般本文で `prefers-reduced-motion` 等が「フォント」を含む行に紛れる誤検出を避ける。
const FONT_LABEL_RE = /\*\*[^*]*フォント[^*]*\*\*\s*[:：]/;
function extractFonts(text) {
  const fonts = [];
  for (const line of text.split(/\r?\n/)) {
    if (!FONT_LABEL_RE.test(line)) continue;
    for (const m of line.matchAll(/`([^`]+)`/g)) {
      const name = m[1].trim();
      if (name) fonts.push(name);
    }
  }
  return fonts;
}
const normFont = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

// --- 実行 ---------------------------------------------------------------------
const designFiles = designMdFiles();
if (designFiles.length === 0) {
  console.warn("[legal-check] 警告: design-md/**/DESIGN.md が 0 件でした。");
}

// DESIGN.md: de-brand + 商標書体 + オープン書体
for (const file of designFiles) {
  const text = read(file);
  const f = rel(file);
  for (const b of scanDenylist(text, BRAND_DENY)) add(f, `ブランド名の混入を検出: "${b}"`);
  for (const b of scanDenylist(text, FONT_DENY)) add(f, `商標/非オープン書体名の混入を検出: "${b}"`);
  for (const font of extractFonts(text)) {
    const n = normFont(font);
    if (OPEN_FONTS.has(n)) continue;
    // 商標書体は上の FONT_DENY で個別報告済み。ここでは allowlist 未登録を要確認として失敗させる。
    add(f, `未知の書体 "${font}": オープンライセンスなら scripts/legal-check.mjs の OPEN_FONTS に追加してください`);
  }
}

// taxonomy.md / index.json: de-brand のみ (公的分類の jsic.json は除外)
for (const name of ["taxonomy.md", "index.json"]) {
  const p = resolve(root, name);
  if (!existsSync(p)) continue;
  const text = read(p);
  for (const b of scanDenylist(text, BRAND_DENY)) add(name, `ブランド名の混入を検出: "${b}"`);
}

// --- 3. attribution: LICENSE / README / NOTICE -------------------------------
function requireContains(name, needles) {
  const p = resolve(root, name);
  if (!existsSync(p)) {
    add(name, "必須ファイルが存在しません");
    return;
  }
  const text = read(p);
  for (const needle of needles) {
    if (!text.includes(needle)) add(name, `必須の記載が見つかりません: "${needle}"`);
  }
}
requireContains("LICENSE", ["MIT License"]);
requireContains("README.md", ["MIT", "e-Stat"]);
requireContains("NOTICE", ["MIT", "e-Stat", "総務省", "PCCS", "JIS", "OFL"]);

// --- 4. jsic 出典 -------------------------------------------------------------
(() => {
  const p = resolve(root, "jsic.json");
  if (!existsSync(p)) return; // jsic.json 未導入環境ではスキップ
  let data;
  try {
    data = JSON.parse(read(p));
  } catch (err) {
    add("jsic.json", `JSON パース失敗: ${err.message}`);
    return;
  }
  const urls = data?.meta?.source?.urls;
  if (!Array.isArray(urls) || urls.length === 0) {
    add("jsic.json", "meta.source.urls (出典 URL) が記載されていません");
  }
})();

// --- 結果 ---------------------------------------------------------------------
if (violations.length > 0) {
  console.error("[legal-check] 検証失敗 (SSOT §8 法務チェック):");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}
console.log(
  `[legal-check] OK: DESIGN.md ${designFiles.length} 件の de-brand / オープン書体 / 出典表示チェックを通過`
);
