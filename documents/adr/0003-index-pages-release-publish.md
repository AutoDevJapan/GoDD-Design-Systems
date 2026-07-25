# ADR-0003: index/pages シャードを GitHub Release asset で公開する

## Status

Accepted

## Date

2026-07-25

## Context

ADR-0001 で `index/pages/{n}.json`（PAGE_SIZE=1000）の契約と生成器（`--pages`）を固定したが、約 52 ファイル・合計数十 MB 級のシャードを `main` に常時コミットすると、次のコストが同時に増える。

- git 履歴・clone / Actions `checkout` の転送量
- PR ごとの差分ノイズ（index 更新のたびに 50+ ファイルが動く）
- 誤って `next build` 全セル生成と結び付けた場合の CI 時間

Issue #63 の受け入れ条件は「summary の `pageCount` に対し各ページが契約を満たし、結合で `entryCount` と一致する」ことであり、**配信媒体が git ツリーであることは必須ではない**。消費者（Matrix 等）は HTTP GET できればよい。

## Decision

1. **`index/pages/*.json` は `main` にコミットしない**（`.gitignore` 維持。ADR-0001 を継承）。
2. **公開手段は GitHub Release asset** とする。固定タグ `index-pages` の Release に次を載せる。
   - `index-pages.zip` … アーカイブ内パス `index/pages/{n}.json`
   - `{n}.json` … 個別ページ（遅延取得用。0-based）
   - `manifest.json` … `entryCount` / `pageCount` / `pageSize` / `pagesBaseUrl` / `generatedAt`
3. **生成・検証・アップロードは手動トリガ（`workflow_dispatch`）のみ**。PR / `push` では走らせない。`next build` や全セル静的生成とは独立。
4. ローカル / CI 内の検証は `pnpm run validate:index-pages`（`index/pages` が存在するときだけ契約を検査）。パッケージ化は `pnpm run package:index-pages`。
5. 消費者向けの正本 URL は Release download URL とする（下記 Consequences）。`raw.githubusercontent.com/.../index/pages/{n}.json` は「将来 git に置く場合の予約パス」であり、Phase 1 の配信正本ではない。

## Options Considered

### Option A: `main` に `index/pages` をコミットする

- **Approach**: 生成物をリポジトリに含める。
- **Pros**: raw.githubusercontent.com の既存パス契約と一致。追加インフラ不要。
- **Cons**: clone / Actions コスト増。index 更新のたびに巨大 diff。
- **Effort**: 小
- **Risk**: 中（リポジトリ肥大が不可逆に近い）

### Option B: GitHub Release asset（本決定）

- **Approach**: Release タグ `index-pages` に zip + 個別 JSON を載せる。workflow_dispatch のみ。
- **Pros**: `main` の checkout コストが増えない。PR でページ生成しない。個別 GET も可能。
- **Cons**: URL が raw.githubusercontent.com と異なる。初回は Pages 設定やバケットより運用手順の説明が必要。
- **Effort**: 小〜中
- **Risk**: 低

### Option C: GitHub Pages（Actions artifact デプロイ）

- **Approach**: `actions/upload-pages-artifact` + `deploy-pages` で `github.io` に `index/pages/{n}.json` を出す。
- **Pros**: パス形状をそのままにできる。CDN 的に扱いやすい。
- **Cons**: 本リポジトリは現時点で Pages 未有効。組織設定・権限追加が前提。Option B より起動コストが高い。
- **Effort**: 中
- **Risk**: 中（設定依存）

### Option D: 業種キー別シャードなど別分割

- **Approach**: PAGE_SIZE ページではなく JSIC 大分類などで切る。
- **Pros**: ファセット連動の取得に寄せられる場合がある。
- **Cons**: ADR-0001 の契約を破棄・再設計する必要がある。#63 の受け入れ（pageCount 結合）と直接は一致しない。
- **Effort**: 大
- **Risk**: 中（契約破壊）

## Rationale

Option B を採る。#63 の目的は「全件フォールバックを不要にする公開手段」であり、git 二重持ちは回避したい。Pages（Option C）は将来の最適化候補として残すが、いま有効化されていないため Phase 1 では Release asset で十分。Option A はコスト要件に反し、Option D は契約変更が過大。

## Consequences

- **Positive**: `main` と PR CI のコストを増やさずにページシャードを公開できる。Matrix は summary → 必要ページのみ取得へ移行できる。
- **Negative**: 消費者は Release URL を知る必要がある（spec / manifest に明記）。`index-pages` タグは上書き更新する運用になる。
- **Neutral**: `index.json` / `index-summary.json` の git 公開は現状維持。

### 公開 URL（正本）

```
https://github.com/AutoDevJapan/GoDD-Design-Systems/releases/download/index-pages/manifest.json
https://github.com/AutoDevJapan/GoDD-Design-Systems/releases/download/index-pages/{n}.json
https://github.com/AutoDevJapan/GoDD-Design-Systems/releases/download/index-pages/index-pages.zip
```

## Rollback Plan

- **Effort to reverse**: Low
- **Steps**: Release `index-pages` を削除し、本 ADR / workflow / スクリプト参照を戻す。消費者は従来どおり `index.json` フォールバックを使う。
- **Point of no return**: なし（git ツリー外のため）。

## Related

- Issue: AutoDevJapan/GoDD-Design-Systems#63
- Prior: ADR-0001 / AutoDevJapan/GoDD-Design-Systems#43 / #61
- Spec: `documents/spec/index-paging.md`
- Workflow: `.github/workflows/publish-index-pages.yml`
