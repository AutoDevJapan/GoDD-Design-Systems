# GoDD-Design-Systems の既存 Prd 配備

## 残す配備と公開データ

既存 URL `https://autodevjapan.github.io/GoDD-Design-Systems/` を唯一の
公開ブラウズ Prd とする。英語ページは同じ配備の `/en/`。
新しいサイト・Preview・dev・stg は作成しない。

- 所有者: `AutoDevJapan`。repository ID: `1293586933`。
- Pages の source: GitHub Actions。配備元: `main`。
- GitHub environment: `github-pages`（ID `18731316271`）。名前ではなく、
  既存 Pages URL と実配備 SHA の一致で Prd と判定する。
- 変更前の実配備: `6981841016`、SHA `bb03a469a3f11a325fdf6e4b2031f3e068c488d7`。
- `index.json` の 51,729 件と `design-md/` のコーパスは Git で保持する。
  UI は `main/index.json` を取得し、セル本文は `blob/main/design-md/…` に進む。
- Release `index-pages` は下流のカタログ取得契約。サイト環境ではないため保持する。
  公開ワークフローは `main` の手動実行だけを許可する。

静的サイトには DB・個人の保存データ・ログイン・購入処理がない。
`next.config.mjs` は `output: export`、`app/` に API route はなく、
外部取得は公開カタログのみ。OAuth・決済・Webhook・Cron・有料 storage の
移行対象は確認されていない。検索・絞り込みは URL query に保存し、
再読込とブラウザの戻る操作で復元する（`catalog-explorer.tsx`）。
この検索条件の保存・復元は、公開後も実ブラウザで確認する。
共通フッターの開示請求リンクは別サイトへの案内であり、本サイトの購入機能ではない。

## 再作成を防ぐ制限

`deploy-pages.yml` の build/deploy と `publish-index-pages.yml` の publish は、
`github.repository == 'AutoDevJapan/GoDD-Design-Systems'` かつ
`github.ref == 'refs/heads/main'` の場合だけ実行する。
Pages 環境の deployment branch policy も `main` の branch のみ。
PR の schema・型・機密検査は継続し、PR から公開配備は行わない。
開発用 `pnpm dev` や CI の一時成果物は公開環境ではない。

## 旧環境の廃止

2026-10-11 に GitHub API と旧配備 status を照合した旧環境:

| 環境 | GitHub environment ID | 直近配備 ID | 実 URL と観測 |
|---|---|---|---|
| development | 17985228188 | 5402863597 | `https://godd-design-systems-dev.vercel.app` は 404 / DEPLOYMENT_NOT_FOUND |
| preview | 17985227983 | 5402853715 | status の environment_url は空。現在の workflow に配備処理なし |
| staging | 17985228357 | 5401604782 | `https://godd-design-systems-stg.vercel.app` は 404 / DEPLOYMENT_NOT_FOUND |

現在の repo に Vercel 配備 workflow はない（ADR-0004 / PR #31）。
repo と各環境の secret 名一覧は空。旧環境専用の必要データは確認されず、
変更でコーパス・公開カタログ契約は変更しない。
旧 URL の 404 は、Vercel の全 project/deployment の削除証明ではない。
別 provider の実 owner/project/deployment ID は未確認であり、今回の操作範囲を
GitHub Pages と対応する GitHub 環境・配備記録に限定する。

既存 Prd の表示・検索・言語切替・検索条件復元を確認してから、上記 3 環境の
配備記録を inactive にし、記録を削除し、環境設定を削除する。
削除後は API で不在を確認し、main 配備・他ブランチの手動実行で再生成がないか確認する。
GitHub の配備記録の削除と、外部 provider の runtime 削除は区別する。
実施結果は ToDo #2386 の製品台帳に ID・時刻・応答とともに記録する。

## レビュー規則と完了条件

使われていない `production` 環境（ID `17985227769`）の既存 required reviewer
`mashfromband` は保持する。この規則を変更して承認を回避しない。
当該環境を使う将来の配備では既存の人間承認手順に従う。
現行 Pages 環境には required reviewer はなく、main の PR 保護も
schema / gitleaks 必須のみで、PR の人間承認要件は確認されていない。

変更は PR・同一 head の CI 成功・別モデルの Must 解消を経てマージする。
既存 Pages の実配備 ID / SHA / URL と UI 動作、旧 GitHub 環境の不在、
再作成防止の実確認が揃うまで、廃止完了とは扱わない。
追加費用・新規有料バックアップは作成しない。

GitHub の公式仕様:
[Pages の配備元と環境制限](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)、
[配備記録の削除](https://docs.github.com/en/rest/deployments/deployments)、
[環境の削除](https://docs.github.com/en/rest/deployments/environments)。
