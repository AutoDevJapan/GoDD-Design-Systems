# index ページング契約

Issue #43 / ADR-0001。`index.json` 全件取得を必須にしないための公開契約。

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
3. 明細が必要なときだけ `index/pages/{n}.json` を取得する（`n = 0 .. pageCount-1`）。
4. ページシャードがまだ公開されていない環境では、フォールバックとして従来の `index.json` 全件取得を許可する（非推奨）。

## URL（raw.githubusercontent.com）

```
https://raw.githubusercontent.com/AutoDevJapan/GoDD-Design-Systems/main/index-summary.json
https://raw.githubusercontent.com/AutoDevJapan/GoDD-Design-Systems/main/index/pages/{n}.json
https://raw.githubusercontent.com/AutoDevJapan/GoDD-Design-Systems/main/index.json
```

## summary フィールド

スキーマ: `documents/schema/index-summary.schema.json`

必須:

- `version` (const 1)
- `generatedAt` / `sourceGeneratedAt`
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

## 生成・検証

```bash
pnpm run build:index-summary          # index-summary.json を再生成
pnpm run build:index-summary -- --pages  # 加えて index/pages/*.json を生成（巨大・既定オフ）
pnpm run validate:index-summary       # スキーマ + index 整合
```

材化パイプラインが `index.json` を更新したら、同じコミットで `build:index-summary` を走らせ summary を同期すること。

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

## 非目標（本仕様の対象外）

- Next.js 静的エクスポートのセルページ分割戦略
- preview 画像の別リポジトリ化（容量律速は別 issue）
- Matrix 側の実装変更そのもの（契約の提供までが Design-Systems の責務）
