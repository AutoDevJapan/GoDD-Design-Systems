# GoDD-Design-Systems

AI エージェントが読む Markdown 形式のデザインシステム (DESIGN.md) のオープンカタログ。

- 業種 (日本標準産業分類 / JSIC) × カラー (PCCS + 無彩色) × ムードで整理
- 各エントリは AI がそのまま読んで一貫した UI を生成できる DESIGN.md
- License: MIT

現在準備中 (WIP)。

## リポジトリ構成

| パス | 役割 |
|---|---|
| `taxonomy.md` | `color` / `mood` の分類語彙 (SSOT) |
| `jsic.json` | 業種軸 (日本標準産業分類 / JSIC) の code→名称→定義 (スキーマ: `documents/schema/jsic.schema.json`) |
| `index.json` | 材化済みセルのメタデータ (スキーマ: `documents/schema/index.schema.json`) |
| `design-md/{jsic}/{color}/{mood}/DESIGN.md` | 材化済みセル本体 (形式: `documents/schema/design-md.schema.md`) |
| `documents/schema/design-md.schema.json` | DESIGN.md frontmatter の JSON Schema |
| `scripts/validate-index.mjs` | `index.json` をスキーマ + 整合性検証 (CI) |
| `scripts/validate-design-md.mjs` | `DESIGN.md` を frontmatter + セクション構造 + index 整合検証 (CI) |
| `scripts/validate-jsic.mjs` | `jsic.json` をスキーマ + 親子整合 + `index.json` 相互検証 (CI) |
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
pnpm build:og   # OGP/Twitter 画像のみ再生成 → public/og/*.png (トークン変更時。決定的・コミット対象)
pnpm validate   # index.json / DESIGN.md / jsic.json + 法務チェックを検証 (CI と同一)
pnpm legal:check # de-brand / オープン書体 / 出典表示のみを個別に検証
```

サイトのトップページは `index.json` と `taxonomy.md` の分類軸をもとに、
材化済みセルの一覧とファセットを静的生成する。

## デプロイ (Vercel / 4 環境)

GitHub Actions (`.github/workflows/deploy.yml`) から Vercel へデプロイする。

| 環境 | トリガ | 内容 |
|---|---|---|
| preview | PR | プレビューをデプロイし URL を PR にコメント |
| dev | `main` への push | dev エイリアスへデプロイ |
| stg | 手動 (`workflow_dispatch`, environment=stg) | staging へ昇格 |
| prd | 手動 (`workflow_dispatch`, environment=prd) | 本番。GitHub `production` 環境の承認ゲート付き |

秘密情報 (`VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`) は
GitHub Actions Secrets で管理し、リポジトリにはコミットしない。

## 業種軸 (JSIC) の収録状況

業種軸は `jsic.json` (日本標準産業分類 / JSIC 第14回改定・令和5年7月告示) を出典とする。
**現時点は未完収録 (partial)** であり、以下を明示する (誇大表示しない)。

| 階層 | 公式項目数 | 本リポジトリ収録数 |
|---|---|---|
| 大分類 | 20 | **20 (全件)** |
| 中分類 | 99 | **99 (全件)** |
| 小分類 | 536 | 7 (代表シード) |
| 細分類 | 1,473 | 8 (代表シード) |

- 大分類・中分類は全件収録済み。小分類・細分類は `index.json` で使用中のコード
  (`6061` 書籍・雑誌小売業 / `7281` 経営コンサルタント業) を含む検証済みの代表項目のみ。
- 残りの細分類は `scripts/build-jsic.mjs` の取込パイプライン (e-Stat 由来) で段階的に拡張する。
  正確な最新件数は `jsic.json` の `meta.ingested` / `meta.official` を参照 (CI が配列長との一致を検証)。
- 出典: 総務省 政策統括官（統計制度担当）/ e-Stat 政府統計の総合窓口。
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
