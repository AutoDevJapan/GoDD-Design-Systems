# GoDD-Design-Systems

AI エージェントが読む Markdown 形式のデザインシステム (DESIGN.md) のオープンカタログ。

- 業種 (日本標準産業分類 / JSIC) × カラー (PCCS + 無彩色) × ムードで整理
- 各エントリは AI がそのまま読んで一貫した UI を生成できる DESIGN.md
- License: MIT

現在準備中 (WIP)。

## リポジトリ構成

| パス | 役割 |
|---|---|
| `taxonomy.md` | `color` / `mood` の分類語彙 (SSOT, 人間可読) |
| `taxonomy.json` | `color` / `mood` slug → `name_ja` / `name_en` の機械可読契約 (スキーマ: `documents/schema/taxonomy.schema.json`)。サイトはロケールに応じてファセット表示へ接続 |
| `jsic.json` | 業種軸 (日本標準産業分類 / JSIC) の code→名称→定義 (スキーマ: `documents/schema/jsic.schema.json`)。任意 `name_en` は MIC 公式英語 Structure Notes 由来（部分収録: `documents/data/jsic-name-en.json`） |
| `index.json` | 材化済みセルのメタデータ SSOT (スキーマ: `documents/schema/index.schema.json`) |
| `index-summary.json` | 軽量サマリ（件数・`pageSize=1000`・ファセット）。消費者は明細より先に取得する (Issue #43 / ADR-0001) |
| `index/pages/{n}.json` | 任意生成のページシャード（0-based）。**git にはコミットしない**。公開は Release タグ `index-pages`（ADR-0003） |
| `documents/spec/index-paging.md` | summary / ページングの公開契約 |
| `documents/adr/0001-index-summary-paging.md` | summary 先行配信の決定記録 |
| `documents/adr/0002-i18n-english-copresence.md` | 英語併記の段階導入（UI chrome 先行・コーパス非一括翻訳） |
| `documents/adr/0003-index-pages-release-publish.md` | pages を Release asset で公開する決定 |
| `documents/adr/0004-github-pages-browse-hosting.md` | 公開ブラウズ UI を GitHub Pages（Actions）でホストする決定 |
| `app/en/` | 英語ホーム（サイト chrome 英訳。セル本文は日本語のまま） |
| `app/cells/[id]/` | セル詳細（単一路線。chrome EN は `?lang=en`。`/en/cells/` は置かない） |
| `lib/i18n.ts` | サイト chrome 向け JA/EN メッセージ |
| `lib/taxonomy-labels.ts` | taxonomy / JSIC のロケール別表示ラベル（ファセット・セル chrome） |
| `scripts/validate-index-pages.mjs` | 生成済み pages の契約検証（未生成時は SKIP） |
| `scripts/package-index-pages.mjs` | Release 用ステージング（manifest + 個別 JSON） |
| `.github/workflows/publish-index-pages.yml` | `workflow_dispatch` のみで pages を Release 公開 |
| `.github/workflows/deploy-pages.yml` | 公開ブラウズ UI を GitHub Pages へデプロイ（path-filtered） |
| `scripts/build-pages.mjs` / `pnpm build:pages` | Pages 向け静的エクスポート（chrome + カタログ。セル HTML 全件は出さない） |
| `design-md/{jsic}/{color}/{mood}/DESIGN.md` | 材化済みセル本体 (形式: `documents/schema/design-md.schema.md`) |
| `documents/schema/design-md.schema.json` | DESIGN.md frontmatter の JSON Schema |
| `scripts/validate-index.mjs` | `index.json` をスキーマ + 整合性検証 (CI) |
| `scripts/build-index-summary.mjs` | `index-summary.json`（と任意で pages）を生成 |
| `scripts/validate-index-summary.mjs` | `index-summary.json` をスキーマ + index 整合検証 (CI) |
| `scripts/validate-design-md.mjs` | `DESIGN.md` を frontmatter + セクション構造 + index 整合検証 (CI) |
| `scripts/validate-jsic.mjs` | `jsic.json` をスキーマ + 親子整合 + `index.json` 相互検証 (CI) |
| `scripts/validate-taxonomy.mjs` | `taxonomy.json` をスキーマ + `index.json` 実使用の全 color/mood カバレッジ検証 (CI) |
| `scripts/build-jsic.mjs` | `jsic.json` の取込/整列/件数再計算パイプライン (再現可能) |
| `scripts/legal-check.mjs` | de-brand / オープン書体 / 出典表示を検証する法務チェック (CI, SSOT §8) |
| `scripts/build-og.mjs` | 各セル・トップの OGP/Twitter 画像 (`public/og/*.png`) をデザイントークン反映で生成 (`next/og`, 同梱 Noto Sans/OFL, self-contained) |
| `LICENSE` / `NOTICE` | MIT ライセンス本文 / 第三者データ・書体の出典と帰属表示 |
| `app/`, `lib/`, `next.config.mjs` | 公開ブラウズ用の静的サイト (Next.js App Router / SSG) |

## 開発

Node.js >= 22 / pnpm >= 10。

```bash
pnpm install
pnpm dev        # サイトをローカル起動 (http://localhost:3000)
pnpm build      # OG 画像生成 (build:og) + 静的サイトを out/ へ書き出し (next build, output: export)
pnpm build:pages # GitHub Pages 向け (basePath 付き。セル HTML / セル OG は既定スキップ)
pnpm build:og   # OGP/Twitter 画像のみ再生成 → public/og/*.png (トークン変更時。決定的・コミット対象)
pnpm validate   # index.json / index-summary.json / DESIGN.md / jsic.json / taxonomy.json + 法務チェックを検証 (CI と同一)
pnpm build:index-summary  # index.json 更新後に summary を再生成（材化と同コミットで同期）
pnpm build:index-summary -- --pages  # ローカルに pages を生成（gitignore）
pnpm validate:index-pages # 生成済み pages の PAGE_SIZE / 結合件数を検証
pnpm package:index-pages  # Release 配布用に dist/ へステージング
pnpm legal:check # de-brand / オープン書体 / 出典表示のみを個別に検証
```

サイトのトップページは `index.json` と `taxonomy.md` の分類軸をもとに、
材化済みセルの一覧とファセットを静的生成する。

下流（Matrix 等）がカタログを読む場合は、まず raw の `index-summary.json` を取得し、
明細は GitHub Release `index-pages` の `{n}.json` だけを遅延取得する（契約: `documents/spec/index-paging.md` / ADR-0003）。
pages の再公開は Actions「Publish index pages」を手動実行する（PR ごとには走らない）。
`index.json` 全件取得はレガシーフォールバックとして残すが推奨しない。

## デプロイ (GitHub Pages)

公開ブラウズ UI は **GitHub Pages** で配信する（ADR-0004 / Issue #66）。

| 項目 | 内容 |
|---|---|
| URL | https://autodevjapan.github.io/GoDD-Design-Systems/ （英語 chrome: `/en/`） |
| ワークフロー | `.github/workflows/deploy-pages.yml` |
| トリガ | `main` への path-filtered push（`app/` `lib/` `public/` 等） / `workflow_dispatch` |
| ビルド | `pnpm run build:pages`（`GODD_PAGES_BUILD=1` + `basePath=/GoDD-Design-Systems`） |
| 成果物 | サイト chrome（`/`・`/en/`）。カタログは raw `index.json` をブラウザで取得。セル HTML は **サンプル 1 件のみ** |
| セル本文 | カタログカードは `design-md/.../DESIGN.md` の GitHub blob へリンク |

Pages のソースは **GitHub Actions**（リポジトリ Settings → Pages → Build and deployment）。
組織ポリシーで API からの有効化が拒否される場合は、初回だけ UI で Actions ソースを選ぶ。

`index/pages` シャードの公開は本デプロイとは別（ADR-0003 / Release タグ `index-pages`）。

## 業種軸 (JSIC) の収録状況

業種軸は `jsic.json` (日本標準産業分類 / JSIC 第14回改定・令和5年7月告示) を出典とする。
日本語名称は全件収録済み。英語名称 (`name_en`) は MIC 公式英語 Structure Notes 由来で **部分収録**。

| 階層 | 公式項目数 | 日本語 `name` | 英語 `name_en` |
|---|---|---|---|
| 大分類 | 20 | **20 (全件)** | **20 (全件)** |
| 中分類 | 99 | **99 (全件)** | **99 (全件)** |
| 小分類 | 536 | **536 (全件)** | 532 (partial) |
| 細分類 | 1,473 | **1,473 (全件)** | 1,450 (partial) |

- 正確な最新件数は `jsic.json` の `meta.ingested` / `meta.official` / `meta.nameEn` を参照。
- 英語ラベルの取込元: `documents/data/jsic-name-en.json`（再生成: `node scripts/extract-jsic-name-en.mjs` → `pnpm run build:jsic`）。
- 欠落している細分類英名は捏造せず、UI は大分類 `name_en` へフォールバックする（51k セル再材化なし）。
- 出典: 総務省 / e-Stat（日本語）および MIC English Structure Notes（英語）。
  一次資料 URL は `jsic.json` の `meta.source.urls` を参照。

## ライセンス / 出典 / 法務

- ライセンス: MIT (`LICENSE`)。第三者データ・書体の出典と帰属は `NOTICE` に明記する。
- カラー軸: PCCS (日本色研配色体系) 24 色相 × トーン + JIS 無彩色を参考にした一般化語彙。
  商用色票・数値データそのものは再配布しない。
- 業種軸: 日本標準産業分類 (JSIC) 第14回改定 (令和5年7月告示)。出典 総務省 / e-Stat。
  分類コード・名称は公的分類 (政府標準利用規約準拠)。詳細は `jsic.json` の `meta.source`。
- 書体: SIL OFL 等のオープンライセンス書体名のみを参照 (バイナリは同梱しない)。
  商標書体名は使用しない。
- de-brand: 特定企業のブランド名・ロゴ・トレードドレス・商標書体名を含めない。
  この方針 (SSOT §8 法務チェックリスト) は `scripts/legal-check.mjs` により CI で
  機械検証する (`schema 検証` ジョブに統合)。良質な既存サイトは着想元に留め、
  出力は一般化されたオリジナルとする。
