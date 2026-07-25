# ADR-0002: 英語併記の段階導入（UI chrome 先行・コーパス非一括翻訳）

## Status

Accepted

## Date

2026-07-25

## Context

Issue #25 は公開 MIT 資産としての国際到達のため、UI・メタ・分類語彙の英語併記を求めている。一方で材化済み `DESIGN.md` は約 5 万件超であり、本文の一括英訳は Actions 時間・レビュー負荷・Generator 側の再材化コストを同時に押し上げる。

公開サイトは `output: 'export'`（完全静的）であり、`app/[locale]/cells/[id]` で全セルを JA/EN 二重生成すると静的ページ数がおよそ倍増し、CI / デプロイ費用が跳ねる。taxonomy.json には既に任意の `name_en` / `family_en` が存在するが、サイト chrome と hreflang は未整備である。

## Decision

1. **Phase 0（スパイク）**: サイト chrome（ヘッダ・フッタ・カタログ UI 文言・ホームメタ）を JA/EN 併記する。ルートは既存 `/`（ja）を維持し、英語ホームを `/en/` に追加する（`trailingSlash: true` と両立）。
2. **`hreflang` / `alternates.languages`** で `/` ↔ `/en/` を相互リンクする。`<html lang>` はロケールに合わせる。
3. **セル詳細（`/cells/{id}/`）のロケール二重静的生成は行わない**（`/en/cells/{id}/` を作らない）。セル本文は当面日本語のまま。
4. **Phase 1**: セル chrome のみ、単一路線上のクエリ `?lang=en`（LocaleSwitcher 連動）で英訳する。英語ホームからのセルリンクも同クエリを付与する。静的ページ数は増やさない（Option C をセル経路に限定適用）。
5. **コーパス一括翻訳は禁止事項として維持**。任意フィールド `titleEn` は未設定時 `title` へフォールバック（充填は別フェーズ・再材化しない）。
6. 分類語彙の英語ラベルは既存の `taxonomy.json` `name_en` をファセット UI に接続する。
7. **JSIC 英名（Phase 2 スライス）**: 総務省 MIC の JSIC Rev.14 English Structure and Explanatory Notes を出典に、`jsic.json` 各項目へ任意 `name_en` を付与する（`documents/data/jsic-name-en.json` → `pnpm run build:jsic`）。細分類は部分収録（欠落は捏造しない）。UI は細分類 `name_en` を優先し、無い場合は大分類 `name_en` へフォールバックする。**コーパス再材化は不要**。

## Options Considered

### Option A: `app/[locale]/...` で全ルートを二重化しセルも EN 静的生成

- **Approach**: 全ページを locale セグメント配下へ移し、generateStaticParams で ja/en × 全セルを列挙。
- **Pros**: DoD（主要ページの英語版 + hreflang）に最も近い。
- **Cons**: 静的ページ約 2 倍。Actions / Pages コスト増。本文未翻訳のまま URL だけ増える。
- **Effort**: 大
- **Risk**: 高（コスト・ビルド時間）。

### Option B: UI chrome + `/en/` デモ経路 + スキーマフック（本決定）

- **Approach**: ホームと chrome のみ英語化し、スキーマに任意 `titleEn` を追加。セル二重生成とコーパス翻訳は後続。
- **Pros**: 低コストで国際公開の導線と契約を固定。`output: export` と両立。
- **Cons**: セル詳細の英語版は未提供。DoD 全体は未達（Issue はオープン継続）。
- **Effort**: 小
- **Risk**: 低。

### Option C: クエリ `?lang=en` のみで切替（パスは単一）

- **Approach**: 静的 HTML は 1 系統、クライアントで文言切替。
- **Pros**: ページ数不増。
- **Cons**: `hreflang` / クローラ向け言語別 URL が弱い。共有 URL の言語が曖昧。
- **Effort**: 小
- **Risk**: 中（SEO 要件と不一致）。

## Rationale

Option B を採る。#25 の価値の大半は「英語話者がカタログの存在と使い方を理解できること」であり、それは chrome とメタで先に満たせる。セル本文の英訳と二重静的生成は費用対効果が悪いため、契約（`titleEn`）だけ先に開き、充填は Generator / 選択的材化で進める。

## Consequences

- **Positive**: `/en/` とセル `?lang=en` で chrome / taxonomy / JSIC（公式英名・部分）ラベルを英語利用できる。コーパス再生成なし。静的ページ数不増。
- **Negative**: セル詳細 URL の言語はクエリ依存のため、ホームほど `hreflang` が強くない。Issue #25 の DoD（セル本文・titleEn 充填・細分類英名の完全収録）は未完。
- **Neutral**: JSIC 細分類 `name_en` は MIC 英語 Structure Notes からの抽出で partial（欠落は major フォールバック）。

## Rollback Plan

- **Effort to reverse**: Low
- **Steps**: `/en/`・i18n モジュール・LocaleSwitcher・スキーマの `titleEn`・本 ADR を削除し、README / sitemap / layout の参照を戻す。
- **Point of no return**: なし（追加契約・追加ルートのため）。

## Related

- Issue: AutoDevJapan/GoDD-Design-Systems#25
- Schema: `documents/schema/design-md.schema.json` / `index.schema.json`（任意 `titleEn`）
- Taxonomy EN labels: `taxonomy.json` `name_en`（既存）
