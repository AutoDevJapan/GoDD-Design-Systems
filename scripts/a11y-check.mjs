#!/usr/bin/env node
// アクセシビリティ回帰ガード (issue #23)。
//   ブラウザ / 追加依存なしで、a11y の要となる不変条件をソースに対して静的検証する。
//   フル監査 (axe 等) の代替ではなく、確立済みの対策が将来の変更で「静かに外れる」
//   ことを防ぐための軽量ゲート。CI (.github/workflows/ci.yml) の schema ジョブに
//   step として統合される (新 required context は増やさない)。
//
//   検証項目:
//     - <html lang="ja"> (WCAG 3.1.1 言語)
//     - スキップリンク (本文へスキップ → #main-content) の存在
//     - 各ページに main ランドマーク (id="main-content") が 1 つ
//     - banner(header) / contentinfo(footer) が main の外に出ている
//     - フォーカス可視 (:focus-visible) / モーション配慮 (prefers-reduced-motion)
//     - アクセント面の文字色トークン (--on-accent) によるコントラスト確保
//     - ファセットチップの aria-label / aria-pressed、検索入力の <label>

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const problems = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);

function read(rel) {
  const p = join(root, rel);
  if (!existsSync(p)) {
    fail(rel, "ファイルが見つかりません");
    return "";
  }
  return readFileSync(p, "utf8");
}

/** src に needle (文字列 or 正規表現) が含まれることを要求する。 */
function want(file, src, needle, label) {
  const ok =
    needle instanceof RegExp ? needle.test(src) : src.includes(needle);
  if (!ok) fail(file, `${label} が見つかりません`);
}

// --- layout: lang / スキップリンク -------------------------------------------
const layout = read("app/layout.tsx");
want("app/layout.tsx", layout, 'lang="ja"', 'lang="ja" 属性');
want("app/layout.tsx", layout, "skip-link", "スキップリンク (.skip-link)");
want("app/layout.tsx", layout, 'href="#main-content"', "スキップリンクの遷移先 #main-content");

// --- globals.css: focus / motion / contrast token ----------------------------
const css = read("app/globals.css");
want("app/globals.css", css, ":focus-visible", "フォーカス可視スタイル (:focus-visible)");
want("app/globals.css", css, ".skip-link", "スキップリンクのスタイル");
want("app/globals.css", css, "prefers-reduced-motion", "prefers-reduced-motion 配慮");
want("app/globals.css", css, "--on-accent", "アクセント面の文字色トークン --on-accent");
// アクセント面で半透明 (rgba white) を使うと AA を割るため禁止。
if (/\.chip-btn\.is-selected[^}]*rgba\(255,\s*255,\s*255/s.test(css)) {
  fail("app/globals.css", "選択チップで半透明の白文字 (AA 未達) が使われています");
}

// --- ページ: main / header / footer ランドマーク ------------------------------
for (const page of ["app/page.tsx", "app/cells/[id]/page.tsx"]) {
  const src = read(page);
  const mains = src.match(/<main[\s>]/g) ?? [];
  if (mains.length !== 1) fail(page, `main ランドマークが 1 つであること (実際: ${mains.length})`);
  want(page, src, 'id="main-content"', "main の id=main-content");
  want(page, src, "<header", "banner (header)");
  want(page, src, "SiteFooter", "contentinfo (SiteFooter)");
  // header / SiteFooter が main の内側に無い (= ランドマークとして機能する) こと。
  const mainOpen = src.indexOf("<main");
  const mainClose = src.indexOf("</main>");
  if (mainOpen >= 0 && mainClose > mainOpen) {
    const inside = src.slice(mainOpen, mainClose);
    if (inside.includes("<header")) fail(page, "header が main の内側にあります (banner にならない)");
    if (inside.includes("SiteFooter")) fail(page, "SiteFooter が main の内側にあります (contentinfo にならない)");
  }
}

// --- ファセット / 検索の識別名 -----------------------------------------------
const explorer = read("app/_components/catalog-explorer.tsx");
want("catalog-explorer.tsx", explorer, "aria-pressed", "チップの aria-pressed");
want("catalog-explorer.tsx", explorer, "aria-label", "チップの aria-label (件数の意味付け)");
want("catalog-explorer.tsx", explorer, /<label\s+htmlFor=/, "検索入力の <label>");

// --- 結果 ---------------------------------------------------------------------
if (problems.length > 0) {
  console.error("a11y-check: 不変条件を満たしていません:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("a11y-check: OK (a11y 不変条件を満たしています)");
