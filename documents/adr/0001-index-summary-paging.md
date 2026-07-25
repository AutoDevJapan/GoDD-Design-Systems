# ADR-0001: index.json の summary 先行配信とページング契約

## Status

Accepted

## Date

2026-07-25

## Context

公開カタログの `index.json` は追記方式で成長し、2026-07-25 時点で約 5.2 万エントリ・非圧縮約 33 MB に達している。Matrix 公開 UI は raw.githubusercontent.com から全件取得するため、初回ロードコストが実数 N に比例する（Issue #43）。

gzip により実転送は非圧縮の約 1/6〜1/7 まで下がるが、5 万件超ではブラウザのパースコストも含め「summary なし全件取得」は持続可能でない。一方でページシャードをすべて git に二重コミットするとリポジトリ容量と Actions checkout コストが増える。Preview 画像を含む `design-md/` 容量が別の律速である点も #43 コメントで指摘済みであり、本決定は index 配信経路に限定する。

## Decision

1. **`index.json` は引き続き SSOT** とし、破壊的に削除・分割しない。
2. **軽量な `index-summary.json` を公開し、消費者はファセットと件数を先に取得する**（Phase 0）。
3. **ページサイズは 1000 固定**とし、将来の明細配信パスを `index/pages/{n}.json`（0-based）として契約する（Phase 1 契約）。巨大シャード本体の常時コミットは本決定では行わない。
4. 生成は `pnpm run build:index-summary`（任意で `--pages`）に集約し、CI は summary のスキーマ＋ index 整合のみを検証する。`next build` による全セル静的生成の拡大は本決定の対象外（禁止事項として維持）。

## Options Considered

### Option A: index.json を業種大分類などで物理分割し SSOT を置き換える

- **Approach**: ルート `index.json` を廃止し、分割ファイルのみを正とする。
- **Pros**: 単一巨大ファイルが消える。
- **Cons**: 既存消費者・検証スクリプト・Generator 材化パイプラインが同時破壊。移行コストが高い。
- **Effort**: 大
- **Risk**: 公開契約の破壊と検証穴。

### Option B: summary 先行 + ページング契約（本決定）

- **Approach**: summary を追加し、ページ URL 規約と生成器を先に固定。シャード実体の全面コミットは後続。
- **Pros**: 非破壊。Matrix は summary だけでファセット UI を立ち上げられる。Actions で `next build` を増やさない。
- **Cons**: 明細の遅延取得実装は消費者側（Matrix 等）の追従が必要。シャード未コミット期間は全件 `index.json` がフォールバック。
- **Effort**: 小〜中
- **Risk**: 低（追加ファイルのみ）。

### Option C: 検索転置索引や別ストアへ即移行

- **Approach**: 事前計算転置索引や外部検索基盤を導入。
- **Pros**: 大規模検索に強い。
- **Cons**: 運用面・コスト面が大きく、#43 の「全件 fetch」問題に対して過剰。
- **Effort**: 大
- **Risk**: 中〜高（運用・課金）。

## Rationale

Option B を採る。現時点の痛みは「初回に明細まで含む全メタを取る」ことであり、ファセットと総件数だけを先に配れば消費者のブロッキングを解除できる。ページ契約を同時に固定することで、後続でシャードを材化しても URL がぶれない。Option A は移行コストが価値に見合わず、Option C は時期尚早。

## Consequences

- **Positive**: Matrix 等が数 KB〜数十 KB の summary で UI を起動できる。`pageSize=1000` が明示され、5 万件超でも段階取得の設計ができる。
- **Negative**: 完全な遅延ロードは消費者実装待ち。シャード未コミット期間はフォールバックで全件取得が残る。
- **Neutral**: `index.json` の検証・材化フローは現状維持。

## Rollback Plan

- **Effort to reverse**: Low
- **Steps**: `index-summary.json` と生成/検証スクリプト、本 ADR / spec を削除し、README・CI の参照を戻す。消費者は従来どおり `index.json` のみを参照すればよい。
- **Point of no return**: なし（追加契約のため）。

## Related

- Issue: AutoDevJapan/GoDD-Design-Systems#43
- Spec: `documents/spec/index-paging.md`
- Schema: `documents/schema/index-summary.schema.json`, `documents/schema/index-page.schema.json`
