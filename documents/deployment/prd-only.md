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
`mashfromband` は実設定の記録として保持する。この文書更新で実設定は変更しない。
2026-10-12の直接委任により、一般的な人手レビュー・日常操作・再承認はAIが担当する。
AIが設計・実装・検査・修正・別モデルレビュー・Must解消・同じHEADのCI確認・マージ・既存Prd反映・後片付けまで進める。
実設定が操作を止める場合は通常の審査で扱い、拒否を迂回しない。顧客契約の人レビューと製品利用者の承認機能は維持する。
要件未指定・新費用・権利・新公開・顧客約束は本人判断とし、秘密情報・既存Prd限定・Rakko限定・受入条件・必須検査を維持する。
既存Discord判断は再質問せず、新APIキーや新費用を導入しない。
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

## 実施結果（2026-10-12、ToDo #2386）

[PR #100](https://github.com/AutoDevJapan/GoDD-Design-Systems/pull/100) を
別モデルの Must なし・同一 head の schema / gitleaks / CodeQL 成功後にマージした。
マージ SHA は `31abea0bf96b1473093124cda961fcdca0bef7ba`。
[main の CI](https://github.com/AutoDevJapan/GoDD-Design-Systems/actions/runs/38149742426) と
[Pages 配備](https://github.com/AutoDevJapan/GoDD-Design-Systems/actions/runs/38149742447) も成功した。
実 Pages 配備 ID `6997376918` は同じ SHA と既存 URL の success を返した。

オーナーの既存 Chrome で日本語・英語カタログを確認した。
検索 `0100` は 1,143 / 51,729 件、英語の `0100_ac-bk_cool` は 1 / 51,729 件。
検索条件を付けた再読込と、公開 DESIGN.md 本文から戻った際の復元も成功した。
ログイン・購入・個人データ保存は上記 source と画面に該当機能がなく N/A。
URL による検索条件の保存・復元は実確認済み。

旧 GitHub 環境 3 件と対応する配備記録 27 件を 204 応答で削除し、
API の全件一覧で旧環境・旧配備が 0 件であることを確認した。
残る環境は既存 Prd の `github-pages` と、人間承認設定を保った未使用の `production`。
Pages の旧 Prd 配備履歴と公開データは保持している。
旧 preview の 15 コミットは main の祖先ではないため、専用作業先に
Git archive ref と検証済み Git bundle（1,862,177 bytes）を保全した。
それらのコーパスのパスは現 main でも欠けておらず、今回の変更でコーパスは変更していない。

旧環境を削除した後、main 以外の手動実行で Pages と Release のジョブが実際にスキップされた:
[Pages の確認](https://github.com/AutoDevJapan/GoDD-Design-Systems/actions/runs/38150302811)、
[Release の確認](https://github.com/AutoDevJapan/GoDD-Design-Systems/actions/runs/38150305326)。
起動自体は可能だが公開ジョブは実行されない。
この結果は GitHub の指定範囲の廃止であり、実 ID 未確認の Vercel 全体を削除したという意味ではない。

製品台帳: `D:/CC/Tools/prd-only-2344/remaining-products/results/GoDD-Design-Systems.json`。
親 ToDo #2344 の全製品完了を示すものではない。
