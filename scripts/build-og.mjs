#!/usr/bin/env node
// OGP / Twitter 画像のビルド時生成 (issue #24)。
//   各セル (index.json のエントリ) とトップページの OG 画像を、デザイントークン
//   (カラー / ムード / 業種) を反映して 1200x630 PNG に描画し public/og/ へ出力する。
//
//   方式:
//     - next/og (satori + resvg / WASM) をビルド時に呼び出し、外部ネットワーク不要で
//       self-contained に PNG を生成する (output: export と両立)。
//     - 書体は next/og 同梱の Noto Sans (SIL OFL) のみを使用し、商標書体を含めない (§8)。
//       同梱書体は欧文のみのため、画像テキストは業種コード (JSIC) / カラー slug /
//       ムード slug / 英字ワードマークに限定し、和文タイトルは画像に載せない
//       (豆腐化・重い CJK 書体の同梱を回避)。意味軸は「実カラーのスウォッチ + slug」で伝える。
//     - カラーは各セルの DESIGN.md の color-system トークン (--color-*) を優先抽出し、
//       未材化セルは color slug (PCCS) から近似パレットを導出する (フォールバック)。
//
//   出力物はコミットする方針 (小サイズ・決定的)。`pnpm build` (prebuild 相当) でも
//   再生成され、トークン変更時に追従する。

import React from "react";
import og from "next/og.js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const { ImageResponse } = og;
const h = React.createElement;

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outDir = resolve(root, "public", "og");

const WIDTH = 1200;
const HEIGHT = 630;

// --- 色ユーティリティ --------------------------------------------------------
function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}
function hslToHex(hd, s, l) {
  // h: deg, s/l: 0..100
  const hh = ((hd % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0, g = 0, b = 0;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function relLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1;
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b);
}
function mix(a, b, t) {
  const ra = hexToRgb(a) ?? { r: 0, g: 0, b: 0 };
  const rb = hexToRgb(b) ?? { r: 255, g: 255, b: 255 };
  const to = (x) => Math.round(x).toString(16).padStart(2, "0");
  return `#${to(ra.r + (rb.r - ra.r) * t)}${to(ra.g + (rb.g - ra.g) * t)}${to(
    ra.b + (rb.b - ra.b) * t
  )}`;
}
/** 背景に対して十分な明度差の前景 (テキスト) 色を返す。 */
function readableOn(bg) {
  return relLuminance(bg) > 0.42 ? "#141a21" : "#f4f6f9";
}

// --- PCCS color slug → 近似 HSL (フォールバック) ------------------------------
// hue 番号 (1..24) → HSL 色相角。PCCS 色相環の見た目に近い概算 (厳密値ではない)。
const PCCS_HUE_DEG = {
  1: 345, 2: 0, 3: 15, 4: 25, 5: 35, 6: 45, 7: 52, 8: 58,
  9: 72, 10: 90, 11: 110, 12: 140, 13: 162, 14: 175, 15: 185, 16: 195,
  17: 208, 18: 218, 19: 232, 20: 256, 21: 272, 22: 288, 23: 312, 24: 330,
};
// tone slug → [saturation%, lightness%]
const PCCS_TONE = {
  v: [88, 50], b: [80, 58], s: [68, 46], dp: [74, 34],
  lt: [62, 72], sf: [44, 64], d: [34, 50], dk: [52, 30],
  p: [40, 88], ltg: [22, 80], g: [18, 58], dkg: [22, 32],
};
const ACHROMATIC = {
  white: "#f7f7f8", "gray-light": "#cfd2d6", gray: "#7f858c",
  "gray-dark": "#3f454c", black: "#1a1c1f",
};

/** color slug から基準色 (base hex) を求める。 */
function slugBaseColor(slug) {
  if (ACHROMATIC[slug]) return ACHROMATIC[slug];
  const dash = slug.lastIndexOf("-");
  if (dash > 0) {
    const hue = slug.slice(0, dash);
    const tone = slug.slice(dash + 1);
    const num = Number(/^h(\d{2})/.exec(hue)?.[1]);
    const deg = PCCS_HUE_DEG[num];
    const t = PCCS_TONE[tone];
    if (deg != null && t) return hslToHex(deg, t[0], t[1]);
  }
  return "#5a6472"; // 不明時のニュートラル
}

/** 基準色から役割ベースの近似パレットを導出する。 */
function paletteFromBase(base) {
  const rgb = hexToRgb(base) ?? { r: 90, g: 100, b: 114 };
  const lum = relLuminance(base);
  const light = lum > 0.5;
  return {
    primary: base,
    secondary: mix(base, light ? "#000000" : "#ffffff", 0.28),
    accent: mix(base, "#e8a13a", 0.65),
    neutral: mix(base, "#8a8f98", 0.6),
    bg: mix(base, "#ffffff", 0.9),
    fg: light ? "#1c2733" : mix(base, "#0b0e12", 0.7),
  };
}

// --- DESIGN.md からトークン抽出 ---------------------------------------------
const ROLE_TOKENS = {
  primary: "--color-primary",
  secondary: "--color-secondary",
  accent: "--color-accent",
  neutral: "--color-neutral",
  bg: "--color-bg",
  fg: "--color-fg",
};
function extractPalette(entry) {
  const fallback = paletteFromBase(slugBaseColor(entry.color));
  const full = resolve(root, entry.path);
  if (!existsSync(full)) return fallback;
  const text = readFileSync(full, "utf8");
  const out = { ...fallback };
  for (const [role, token] of Object.entries(ROLE_TOKENS)) {
    // 例: | Primary | `--color-primary` | `#2f6fb0` |
    const re = new RegExp(`${token}\`[^|]*\\|\\s*\`(#[0-9a-fA-F]{6})\``);
    const m = re.exec(text);
    if (m) out[role] = m[1].toLowerCase();
  }
  return out;
}

// --- 描画部品 ----------------------------------------------------------------
function Pill(text, pal) {
  return h(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        marginRight: 16,
        padding: "10px 22px",
        borderRadius: 999,
        border: `2px solid ${pal.primary}`,
        backgroundColor: mix(pal.bg, pal.primary, 0.08),
        color: pal.fg,
        fontSize: 26,
      },
    },
    text
  );
}

function Swatch(hex, muted) {
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", alignItems: "center", marginRight: 18 } },
    [
      h("div", {
        key: "sw",
        style: {
          width: 96,
          height: 66,
          borderRadius: 12,
          backgroundColor: hex,
          border: "1px solid rgba(0,0,0,0.14)",
          display: "flex",
        },
      }),
      h(
        "div",
        { key: "hx", style: { display: "flex", marginTop: 8, fontSize: 18, color: muted } },
        hex
      ),
    ]
  );
}

function Spectrum(colors) {
  return h(
    "div",
    { style: { display: "flex", height: 14 } },
    colors.map((c, i) =>
      h("div", { key: i, style: { display: "flex", flex: 1, backgroundColor: c } })
    )
  );
}

// --- セルカード --------------------------------------------------------------
function CellCard(entry, pal) {
  const muted = mix(pal.fg, pal.bg, 0.42);
  const chips = [entry.color, entry.mood, ...entry.tags.slice(0, 2)];
  const swatches = [
    ["primary", pal.primary],
    ["secondary", pal.secondary],
    ["accent", pal.accent],
    ["neutral", pal.neutral],
  ];
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: pal.bg,
        color: pal.fg,
        fontFamily: "sans-serif",
      },
    },
    [
      Spectrum([pal.primary, pal.secondary, pal.accent, pal.neutral]),
      h(
        "div",
        {
          key: "body",
          style: {
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "52px 64px",
            justifyContent: "space-between",
          },
        },
        [
          // ワードマーク
          h(
            "div",
            { key: "wm", style: { display: "flex", alignItems: "center" } },
            [
              h("div", {
                key: "sq",
                style: { width: 44, height: 44, borderRadius: 10, backgroundColor: pal.primary, display: "flex" },
              }),
              h(
                "div",
                { key: "wt", style: { display: "flex", marginLeft: 18, fontSize: 30, color: muted } },
                "GoDD Design-Systems"
              ),
            ]
          ),
          // 業種コード + トークンピル
          h(
            "div",
            { key: "mid", style: { display: "flex", flexDirection: "column" } },
            [
              h(
                "div",
                { key: "lbl", style: { display: "flex", fontSize: 24, letterSpacing: 6, color: muted } },
                "INDUSTRY · JSIC"
              ),
              h(
                "div",
                { key: "code", style: { display: "flex", fontSize: 140, lineHeight: 1, color: pal.primary } },
                entry.jsic
              ),
              h(
                "div",
                { key: "pills", style: { display: "flex", marginTop: 26, flexWrap: "wrap" } },
                chips.map((c) => Pill(c, pal))
              ),
            ]
          ),
          // パレット + メタ
          h(
            "div",
            { key: "foot", style: { display: "flex", alignItems: "flex-end", justifyContent: "space-between" } },
            [
              h("div", { key: "sws", style: { display: "flex" } }, swatches.map(([, hex]) => Swatch(hex, muted))),
              h(
                "div",
                { key: "meta", style: { display: "flex", fontSize: 22, color: muted } },
                "MIT · open DESIGN.md catalog"
              ),
            ]
          ),
        ]
      ),
      h("div", { key: "acc", style: { display: "flex", height: 14, backgroundColor: pal.accent } }),
    ]
  );
}

// --- トップページカード ------------------------------------------------------
function HomeCard() {
  const bg = "#0f141a";
  const fg = "#f4f6f9";
  const muted = "#9aa4b0";
  const accent = "#e8a13a";
  // カラー軸を表す多色帯 / グリッド (PCCS フォールバックで生成)。
  const hues = [2, 5, 8, 10, 12, 15, 17, 19, 21, 23];
  const spectrum = hues.map((n) => hslToHex(PCCS_HUE_DEG[n], 70, 56));
  const grid = [];
  for (const tone of ["lt", "s", "dk"]) {
    for (const n of hues) {
      const t = PCCS_TONE[tone];
      grid.push(hslToHex(PCCS_HUE_DEG[n], t[0], t[1]));
    }
  }
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: bg,
        color: fg,
        fontFamily: "sans-serif",
      },
    },
    [
      Spectrum(spectrum),
      h(
        "div",
        { key: "body", style: { display: "flex", flexDirection: "column", flex: 1, padding: "56px 64px", justifyContent: "space-between" } },
        [
          h(
            "div",
            { key: "top", style: { display: "flex", flexDirection: "column" } },
            [
              h(
                "div",
                { key: "wm", style: { display: "flex", alignItems: "center" } },
                [
                  h("div", { key: "sq", style: { width: 48, height: 48, borderRadius: 12, backgroundColor: accent, display: "flex" } }),
                  h("div", { key: "t", style: { display: "flex", marginLeft: 20, fontSize: 64, color: fg } }, "GoDD Design-Systems"),
                ]
              ),
              h(
                "div",
                { key: "tag", style: { display: "flex", marginTop: 26, fontSize: 34, color: muted } },
                "JSIC industry × PCCS color × mood"
              ),
              h(
                "div",
                { key: "tag2", style: { display: "flex", marginTop: 10, fontSize: 28, color: muted } },
                "an open, AI-readable DESIGN.md catalog · MIT"
              ),
            ]
          ),
          // カラー軸のグリッド (マトリクスの含意)
          h(
            "div",
            { key: "grid", style: { display: "flex", flexWrap: "wrap", width: 1072 } },
            grid.map((c, i) =>
              h("div", { key: i, style: { width: 104, height: 40, borderRadius: 8, marginRight: 3, marginBottom: 3, backgroundColor: c, display: "flex" } })
            )
          ),
        ]
      ),
      h("div", { key: "acc", style: { display: "flex", height: 14, backgroundColor: accent } }),
    ]
  );
}

// --- 実行 --------------------------------------------------------------------
async function render(element, file) {
  const res = new ImageResponse(element, { width: WIDTH, height: HEIGHT });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(file, buf);
  return buf.length;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const index = JSON.parse(readFileSync(resolve(root, "index.json"), "utf8"));
  let total = 0;

  const homeBytes = await render(HomeCard(), join(outDir, "home.png"));
  total += homeBytes;
  console.log(`[build-og] home.png (${homeBytes} B)`);

  for (const entry of index.entries) {
    const pal = extractPalette(entry);
    const bytes = await render(CellCard(entry, pal), join(outDir, `${entry.id}.png`));
    total += bytes;
    console.log(`[build-og] ${entry.id}.png (${bytes} B)`);
  }

  console.log(
    `[build-og] OK: ${index.entries.length + 1} 枚生成 (計 ${(total / 1024).toFixed(1)} KB) → public/og/`
  );
}

main().catch((err) => {
  console.error("[build-og] 失敗:", err);
  process.exit(1);
});
