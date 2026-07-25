#!/usr/bin/env node
/**
 * MIC 公式英語 Structure Notes から jsic-name-en.json を再生成する（手動メンテ用）。
 *
 * 出典:
 *   https://www.soumu.go.jp/english/dgpp_ss/seido/sangyo/san14-3.htm
 *   https://www.soumu.go.jp/english/dgpp_ss/seido/sangyo/san14-3a.htm
 *
 * CI では実行しない（ネットワーク依存）。生成後は `pnpm run build:jsic` で jsic.json へ反映。
 * 欠落コードの英語名は捏造しない。
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outPath = resolve(root, "documents/data/jsic-name-en.json");
const indexUrl = "https://www.soumu.go.jp/english/dgpp_ss/seido/sangyo/san14-3.htm";
const structUrl = "https://www.soumu.go.jp/english/dgpp_ss/seido/sangyo/san14-3a.htm";

/** Official ALL-CAPS division titles → Title Case for UI (wording from MIC index). */
const MAJOR_NAME_EN = {
  A: "Agriculture and Forestry",
  B: "Fisheries",
  C: "Mining and Quarrying of Stone and Gravel",
  D: "Construction",
  E: "Manufacturing",
  F: "Electricity, Gas, Heat Supply and Water",
  G: "Information and Communications",
  H: "Transport and Postal Services",
  I: "Wholesale and Retail Trade",
  J: "Finance and Insurance",
  K: "Real Estate and Goods Rental and Leasing",
  L: "Scientific Research, Professional and Technical Services",
  M: "Accommodations, Eating and Drinking Services",
  N: "Living-related and Personal Services and Amusement Services",
  O: "Education, Learning Support",
  P: "Medical, Health Care and Welfare",
  Q: "Compound Services",
  R: "Services, N.E.C.",
  S: "Government, Except Elsewhere Classified",
  T: "Industries Unable to Classify",
};

function toLines(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, " ")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const structHtml = await (await fetch(structUrl)).text();
const structLines = toLines(structHtml);

const subclass = {};
const middle = {};
const minor = {};
for (const line of structLines) {
  let m = /^(\d{4})\s+(.+)$/.exec(line);
  if (
    m &&
    /^[A-Za-z]/.test(m[2]) &&
    m[2].length < 200 &&
    !/soumu|javascript|cookie/i.test(m[2])
  ) {
    subclass[m[1]] = m[2].trim();
    continue;
  }
  m = /^(\d{3})\s+([A-Z].+)$/.exec(line);
  if (m && m[2].length < 160) {
    minor[m[1]] = m[2].trim();
    continue;
  }
  m = /^(\d{2})\s+([A-Z].+)$/.exec(line);
  if (m && m[2].length < 120) middle[m[1]] = m[2].trim();
}

const out = {
  meta: {
    classification: "Japan Standard Industrial Classification (JSIC) English labels",
    revision: "Rev. 14, 2023",
    source: {
      name: "Ministry of Internal Affairs and Communications (MIC) — JSIC Rev.14 Structure and Explanatory Notes (English)",
      urls: [
        indexUrl,
        structUrl,
        "https://www.soumu.go.jp/english/dgpp_ss/seido/sangyo/index.htm",
      ],
      note: "English labels from the official MIC English Structure and Explanatory Notes for JSIC Rev.14. Major names are Title Case renderings of the official ALL-CAPS division titles on the index page. Middle/minor/subclass names are taken verbatim from san14-3a.htm where parseable. Partial coverage only — do not invent missing English names.",
    },
    coverage: {
      major: Object.keys(MAJOR_NAME_EN).length,
      middle: Object.keys(middle).length,
      minor: Object.keys(minor).length,
      subclass: Object.keys(subclass).length,
      official: { major: 20, middle: 99, minor: 536, subclass: 1473 },
      note: "Gaps are left without name_en (UI falls back to major name_en + code). Re-run: node scripts/extract-jsic-name-en.mjs && pnpm run build:jsic",
    },
  },
  major: MAJOR_NAME_EN,
  middle,
  minor,
  subclass,
};

writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log(
  `[extract-jsic-name-en] wrote ${outPath} (major ${out.meta.coverage.major} / middle ${out.meta.coverage.middle} / minor ${out.meta.coverage.minor} / subclass ${out.meta.coverage.subclass})`,
);
