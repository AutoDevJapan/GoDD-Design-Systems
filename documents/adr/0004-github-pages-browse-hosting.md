# ADR-0004: 公開ブラウズ UI を GitHub Pages（Actions）でホストする

## Status

Accepted

## Date

2026-07-25

## Context

Issue #66 で、公開ブラウズ URL（`https://autodevjapan.github.io/GoDD-Design-Systems/` および `/en/`）が GitHub Pages の「Site not found」を返していた。API 上は `has_pages: false` であり、Vercel 向け deploy workflow は #31 で削除済み、README の「Vercel / 4 環境」記述は実態と矛盾していた。

`next.config.mjs` は `output: 'export'` + `trailingSlash: true` のまま静的公開前提だが、`index.json` は約 5.1 万エントリあり、セル詳細 HTML とセル OG を全件静的生成すると CI 時間・artifact サイズが非現実的になる。カタログ UI 自体はビルド時に埋め込まれた軽量インデックスをクライアントで絞り込む設計である。

ADR-0003 の Option C は **index/pages シャード配信** の候補であり、本 ADR は **ブラウズ UI ホスト** を対象とする（別関心）。

## Decision

1. **ホストは GitHub Pages** とし、ソースは **GitHub Actions**（`actions/upload-pages-artifact` + `actions/deploy-pages`）とする。
2. **公開 URL** は `https://autodevjapan.github.io/GoDD-Design-Systems/`（英語 chrome は `/en/`）。`NEXT_PUBLIC_SITE_URL` の既定もこれに合わせる。
3. **`GODD_PAGES_BUILD=1` のとき** `basePath` / `assetPrefix` を `/GoDD-Design-Systems` に設定する（project site）。ローカル `pnpm dev` / 通常 `pnpm build` では付けない。
4. **Pages ビルドはサイト chrome を静的エクスポート**し、カタログ明細は **`index.json` を raw.githubusercontent.com からクライアント fetch** する（HTML に 5.1 万件を埋め込まない）。セル詳細 HTML（`/cells/[id]/`）は **既定 1 件のみ**（`GODD_STATIC_CELL_LIMIT=1`。`output: export` が空の `generateStaticParams` を拒否するため）。カタログのカードは DESIGN.md の **GitHub blob URL** へ誘導する。
5. **OG 画像** は Pages ビルドで `home.png` のみ再生成する（`GODD_OG_CELL_LIMIT=0`）。コミット済みサンプルセル OG は artifact に含まれるが、全 5.1 万枚は生成しない。
6. **トリガ** は `main` への path-filtered push（サイト関連パス）と `workflow_dispatch`。concurrency は `cancel-in-progress: true`。`index/pages` の Release 公開（ADR-0003）とは独立。
7. エントリポイントは `pnpm run build:pages`（`scripts/build-pages.mjs`）。

## Options Considered

### Option A: 全セル静的 HTML を Pages に載せる

- **Pros**: `/cells/{id}/` が github.io 上で完結。
- **Cons**: 5.1 万 HTML + OG 生成は CI 時間・容量が過大。
- **Effort**: 大
- **Risk**: 高（タイムアウト・コスト）

### Option B: chrome + カタログのみ（本決定）

- **Pros**: Actions を安く保てる。`/` と `/en/` の到達を最優先で復旧できる。コーパス本文は git / raw で既に公開済み。
- **Cons**: セル詳細は github.io 上の専用 HTML ではない（blob へ遷移）。
- **Effort**: 小〜中
- **Risk**: 低

### Option C: 代替 CDN（Vercel 再導入など）

- **Pros**: project basePath が不要な場合がある。
- **Cons**: #31 で意図的に外した経路。秘密情報と 4 環境運用が再発する。
- **Effort**: 中
- **Risk**: 中（運用・秘密情報）

## Rationale

#66 のブロッカーは「ホスト自体が無い」ことであり、まず github.io でアプリ HTML を 200 返せる状態に戻す。全セル HTML は受け入れに必須ではなく、コスト制約に反するため Option B を採る。index/pages シャードは引き続き Release（ADR-0003）が正本。

## Consequences

- **Positive**: 公開ブラウズと `/en/` chrome 検証が可能になる。README のデプロイ節が実態と一致する。
- **Negative**: Pages 上ではセル専用ページが無い（カタログ → GitHub）。将来フルセル静的化する場合は別予算・別パイプラインが必要。
- **Neutral**: `pnpm build`（非 Pages）の挙動は従来どおり全セル列挙可能。実用上は `GODD_STATIC_CELL_LIMIT` でのサンプル検証を推奨。

## Verification

- `pnpm run build:pages` が `out/index.html` と `out/en/index.html` を生成する。
- デプロイ後、`/` と `/en/` が HTTP 200 でアプリ HTML を返す（GitHub の Site-not-found ではない）。
