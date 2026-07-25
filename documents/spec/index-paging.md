# index ページング契約

Issue #43 / ADR-0001 / ADR-0003。`index.json` 全件取得を必須にしないための公開契約。

## 用語

| 用語 | 意味 |
|---|---|
| SSOT index | リポジトリルートの `index.json`（従来どおり・破壊しない） |
| summary | `index-summary.json`（件数・ページメタ・ファセットのみ） |
| page shard | `index/pages/{n}.json`（0-based、最大 `pageSize` 件） |

## 定数

| 名前 | 値 | 備考 |
|---|---|---|
| `PAGE_SIZE` | `1000` | 破壊的変更時は summary `version` を上げ、本仕様を改訂する |

## 取得手順（消費者）

1. `GET .../main/index-summary.json` を取得する。
2. UI のファセット・総件数・`pageCount` を summary から描画する。
3. 明細が必要なときだけページシャードを取得する（`n = 0 .. pageCount-1`）。
   - **正本（ADR-0003）**: GitHub Release `index-pages` の `{n}.json`
   - 任意: 同 Release の `manifest.json` で `pagesBaseUrl` / `pageCount` を確認
4. ページシャードがまだ公開されていない環境では、フォールバックとして従来の `index.json` 全件取得を許可する（非推奨）。

## URL

### summary / SSOT（git `main`）

```
https://raw.githubusercontent.com/AutoDevJapan/GoDD-Design-Systems/main/index-summary.json
https://raw.githubusercontent.com/AutoDevJapan/GoDD-Design-Systems/main/index.json
```

### page shards（Release asset・正本）

`main` にはコミットしない（`.gitignore` の `/index/pages/`）。公開は Release タグ `index-pages`（ADR-0003）。

```
https://github.com/AutoDevJapan/GoDD-Design-Systems/releases/download/index-pages/manifest.json
https://github.com/AutoDevJapan/GoDD-Design-Systems/releases/download/index-pages/{n}.json
https://github.com/AutoDevJapan/GoDD-Design-Systems/releases/download/index-pages/index-pages.zip
```

zip 内パスは `index/pages/{n}.json`。個別 asset 名は `{n}.json`（0-based）。

### 予約パス（git に置く場合）

```
https://raw.githubusercontent.com/AutoDevJapan/GoDD-Design-Systems/main/index/pages/{n}.json
```

Phase 1 では配信正本ではない。

## summary フィールド

スキーマ: `documents/schema/index-summary.schema.json`

必須:

- `version` (const 1)
- `generatedAt` / `sourceGeneratedAt`（両方とも元 `index.json` の `generatedAt`。再生成ノイズを避けるため wall-clock は使わない）
- `entryCount` / `pageSize` (1000) / `pageCount`
- `facets.{jsic,color,mood,tag}[]` … `{ value, count }`（count 降順、同点は value 昇順）

## page shard フィールド

スキーマ: `documents/schema/index-page.schema.json`

- `page`: 0-based
- `pageSize`: 1000
- `entryCount`: そのページの件数（最終ページ以外は 1000）
- `entries`: `index.json` と同じ entry オブジェクトのスライス
  - スライス範囲: `[page * PAGE_SIZE, min(entryCount, (page+1) * PAGE_SIZE))`
  - 順序は SSOT `index.json` の `entries` 配列順を維持

## 導出可能なフィールド（削減ヒント）

後続 Phase（lean entry）向け。本 PR では entry 形状を変えない。

- `id` は `{jsic}_{color}_{mood}`（variant>0 は `_v{n}`）
- `path` は `design-md/{jsic}/{color}/{mood}/DESIGN.md`（variant 時は `/v{n}/` を挟む）

## 生成・検証・公開

```bash
pnpm run build:index-summary                 # index-summary.json を再生成
pnpm run build:index-summary -- --pages      # 加えて index/pages/*.json（巨大・既定オフ・git 外）
pnpm run validate:index-summary              # スキーマ + index 整合
pnpm run validate:index-pages                # pages があるとき契約検証（なければ SKIP）
pnpm run package:index-pages                 # Release 用 dist/ ステージング
```

公開は GitHub Actions `Publish index pages`（`workflow_dispatch` のみ）。PR / push では実行しない。

材化パイプラインが `index.json` を更新したら、同じコミットで `build:index-summary` を走らせ summary を同期すること。pages の Release 再公開は別途手動ワークフローで行う。

## 受け入れ条件 (Given / When / Then)

- Given 有効な `index.json` がある
  When `pnpm run build:index-summary` を実行する
  Then `index-summary.json` の `entryCount` が `entries.length` と一致し、`pageCount = ceil(entryCount/1000)` になる

- Given 同期済みの `index-summary.json` がある
  When `pnpm run validate:index-summary` を実行する
  Then スキーマ検証とファセット再集計が成功する

- Given 消費者がカタログ UI を開く
  When summary のみを取得する
  Then ファセットと総件数を明細なしで表示できる

- Given summary の `pageCount` と生成済み `index/pages`
  When `pnpm run validate:index-pages` を実行する
  Then 各ページが PAGE_SIZE=1000 契約を満たし、全ページ結合で `entryCount` と一致する

- Given Release `index-pages` が公開されている
  When `releases/download/index-pages/{n}.json` を取得する
  Then 上記ページ契約と同じ JSON が返る

## 非目標（本仕様の対象外）

- Next.js 静的エクスポートのセルページ分割戦略
- preview 画像の別リポジトリ化（容量律速は別 issue）
- Matrix 側の実装変更そのもの（契約の提供までが Design-Systems の責務）
- GitHub Pages へのデプロイ（将来候補。ADR-0003 Option C）
