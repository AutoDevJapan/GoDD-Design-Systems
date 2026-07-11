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
| `app/`, `lib/`, `next.config.mjs` | 公開ブラウズ用の静的サイト (Next.js App Router / SSG) |

## 開発

Node.js >= 22 / pnpm >= 10。

```bash
pnpm install
pnpm dev        # サイトをローカル起動 (http://localhost:3000)
pnpm build      # 静的サイトを out/ へ書き出し (next build, output: export)
pnpm validate   # index.json と DESIGN.md を検証 (CI と同一)
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

## 出典 / 法務

- カラー軸: PCCS (日本色研配色体系) 24 色相 × トーン + JIS 無彩色。
- 業種軸: 日本標準産業分類 (JSIC) 第14回改定 (令和5年7月告示)。出典 総務省 / e-Stat。
  分類コード・名称は公的分類 (政府標準利用規約準拠)。詳細は `jsic.json` の `meta.source`。
- 特定製品・ブランドの色名 / 書体は用いない。UI は `system-ui` 系のオープンな
  フォントスタックのみを使用する。
