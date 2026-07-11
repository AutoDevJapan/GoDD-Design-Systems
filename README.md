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
| `index.json` | 材化済みセルのメタデータ (スキーマ: `documents/schema/index.schema.json`) |
| `scripts/validate-index.mjs` | `index.json` をスキーマ + 整合性検証 (CI) |
| `app/`, `lib/`, `next.config.mjs` | 公開ブラウズ用の静的サイト (Next.js App Router / SSG) |

## 開発

Node.js >= 22 / pnpm >= 10。

```bash
pnpm install
pnpm dev        # サイトをローカル起動 (http://localhost:3000)
pnpm build      # 静的サイトを out/ へ書き出し (next build, output: export)
pnpm validate   # index.json を検証
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

## 出典 / 法務

- カラー軸: PCCS (日本色研配色体系) 24 色相 × トーン + JIS 無彩色。
- 業種軸: 日本標準産業分類 (JSIC)。
- 特定製品・ブランドの色名 / 書体は用いない。UI は `system-ui` 系のオープンな
  フォントスタックのみを使用する。
