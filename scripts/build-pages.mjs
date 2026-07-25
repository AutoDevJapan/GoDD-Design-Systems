#!/usr/bin/env node
// GitHub Pages 向け静的エクスポート（Issue #66 / ADR-0004）。
// 51k セル HTML / 全件 OG は生成せず、サイト chrome（`/` `/en/`）+ カタログのみ。

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

process.env.GODD_PAGES_BUILD = "1";
process.env.NEXT_PUBLIC_SITE_URL ??=
  "https://autodevjapan.github.io/GoDD-Design-Systems";
// クライアントへは渡さないが、明示しておく（サーバ側ゲートと一致）。
// output:export は空の generateStaticParams を拒否するため最低 1。全件は出さない。
process.env.GODD_STATIC_CELL_LIMIT ??= "1";
process.env.GODD_OG_CELL_LIMIT ??= "0";

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

console.log(
  `[build-pages] GODD_PAGES_BUILD=1 SITE_URL=${process.env.NEXT_PUBLIC_SITE_URL} ` +
    `STATIC_CELL_LIMIT=${process.env.GODD_STATIC_CELL_LIMIT} OG_CELL_LIMIT=${process.env.GODD_OG_CELL_LIMIT}`,
);

run("node", ["scripts/build-og.mjs"]);
run("pnpm", ["exec", "next", "build"]);

console.log("[build-pages] OK → out/");
