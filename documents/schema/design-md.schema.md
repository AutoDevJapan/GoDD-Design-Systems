# design-md.schema.md — DESIGN.md オンディスク形式の仕様

本ドキュメントは GoDD-Design-Systems の各セル
`design-md/{jsic}/{color}/{mood}/DESIGN.md` の **オンディスク Markdown 形式**を定義する
単一情報源 (SSOT) である。

- 上位仕様 `DESIGN-PROMPT-EMPIRE-SPEC.md` §3（DESIGN.md を約10セクションに分割）に準拠する。
- Generator (private) の 10 セクションスキーマと**整合**する（セクション `id`・出現順を一致させる）。
- 機械検証: frontmatter は `design-md.schema.json`（JSON Schema, ajv）で、本文セクション構造は
  `scripts/validate-design-md.mjs`（`pnpm run validate:design-md`）で検証する。CI (`schema 検証` ジョブ) に統合済み。
- 法務 (§8): de-brand 徹底。他社ブランド名・ロゴ・商標フォント名を含めない。フォントは
  オープンライセンス (商用配布可) のみ。良質サイトは着想元に留め、特定サイトを再現しない。

---

## 1. ファイル全体の構造

DESIGN.md は次の順に構成する。

1. **frontmatter**（`---` で囲む meta ブロック。ファイル先頭）— SSOT §3 の `meta` セクションに対応。
2. **H1 タイトル**（`# {title}`）。
3. **本文 9 セクション**（`## {ja} / {id}` の H2 見出し。下記の順序で 1 回ずつ出現）。

```markdown
---
id: 7281_h17b-lt_trustworthy
title: "経営コンサルタント業 × ライトブルー × 信頼"
jsic: "7281"
color: h17b-lt
mood: trustworthy
tags: [professional, geometric-grid, sans-serif]
schemaVersion: 1
license: MIT
generatedAt: "2026-07-11T00:00:00Z"
---

# 経営コンサルタント業 × ライトブルー × 信頼

## アトモスフィア / atmosphere
...
```

---

## 2. frontmatter（meta）

ファイル先頭の `---` 行で開始し、次の `---` 行で終了する。中身は **flat な `key: value`** のみ。
ネスト・複数行値は禁止（配列は `[a, b, c]` のインライン記法のみ許可）。値は必要に応じて
ダブルクォートで囲む。正準スキーマは `design-md.schema.json`。

| キー | 必須 | 型 / 規則 | 説明 |
|---|---|---|---|
| `id` | ✅ | `^[0-9]{4}_slug_slug$` | セルの安定 ID。`{jsic}_{color}_{mood}`。`index.json` の `entry.id` と一致。 |
| `title` | ✅ | 1–200 文字 | 人間可読の見出し。`index.json` の `entry.title` と一致。 |
| `jsic` | ✅ | `^[0-9]{4}$` | JSIC 細分類コード。出典 `jsic.json`。 |
| `color` | ✅ | slug (`taxonomy.md §1`) | カラー軸の値。 |
| `mood` | ✅ | slug (`taxonomy.md §2`) | ムード軸の値。 |
| `tags` | 任意 | slug の配列（一意） | 軸に掛けない検索用タグ。`index.json` の `entry.tags` と一致。 |
| `schemaVersion` | ✅ | 整数 ≥ 1 | DESIGN.md 形式のメジャーバージョン。 |
| `generatedAt` | ✅ | date-time | 材化 (初回生成) 時刻。 |
| `updatedAt` | 任意 | date-time | 再材化/更新時刻。 |
| `license` | 任意 | SPDX 文字列 | 既定はリポジトリの MIT。 |

frontmatter の `id / title / jsic / color / mood / tags` は、対応する `index.json` エントリと
**一致していなければならない**（検証スクリプトが相互照合する）。

---

## 3. 本文セクション（9 個・順序固定）

各セクションは `## {ja} / {id}` 形式の H2 見出しで始める。見出しは下表の順序で **各 1 回**出現し、
本文（見出し間のテキスト）は**非空**であること。`{id}` はセクションの安定キーで、Generator の
partial ディレクトリ名と対応する（一度公開したら変更しない）。

| # | 見出し (`## {ja} / {id}`) | 役割 | 推奨内容（Generator 必須フィールド由来） |
|---|---|---|---|
| 1 | `## アトモスフィア / atmosphere` | デザインコンセプト・トーン | concept / keywords / toneOfVoice |
| 2 | `## カラーシステム / color-system` | 役割ベースのパレット | palette（primary/secondary/accent/neutral/bg/fg）/ contrastNotes |
| 3 | `## タイポグラフィ / typography` | 書体・スケール・ウェイト | headingFont / bodyFont / scale / weights（**オープンフォントのみ**） |
| 4 | `## 余白とレイアウト / spacing-layout` | 余白・グリッド・幅 | spacingScale / grid / containerWidths |
| 5 | `## 奥行きとシャドウ / depth-shadow` | 段階・影・角丸 | elevations / shadows / radii |
| 6 | `## コンポーネント / components` | コンポーネント在庫 | inventory（1 件以上） |
| 7 | `## ガードレール / guardrails` | 推奨/禁止・a11y | dos / donts / accessibility |
| 8 | `## レスポンシブ / responsive` | ブレークポイント | breakpoints / notes |
| 9 | `## エージェントガイド / agent-guide` | 注入・制約指針 | usage / injection / constraints |

> 「推奨内容」は記述粒度の指針であり、本文は自然な Markdown（箇条書き・表・トークン定義）で表現してよい。
> 検証は「見出しの存在・順序・本文の非空」を必須とし、細粒度の内部構造は強制しない。
> 正準リストは `scripts/design-md-sections.mjs`（機械可読）に定義され、本表と一致する。

---

## 4. 検証

```bash
pnpm run validate:design-md   # DESIGN.md 群を検証（frontmatter + セクション構造 + index 整合）
pnpm run validate             # index.json と DESIGN.md を両方検証（CI と同一）
```

検証項目:

1. frontmatter が `design-md.schema.json` に適合する。
2. 本文 9 セクションが定義順に各 1 回出現し、本文が非空である。
3. ファイルパス `design-md/{jsic}/{color}/{mood}/DESIGN.md` が frontmatter の `jsic/color/mood` と一致する。
4. `index.json` に対応エントリが存在し、`id/title/jsic/color/mood/tags/path` が一致する。
5. `index.json` の `hash` がファイル内容の SHA-256（LF 正規化）と一致する。
6. `index.json` の全エントリに対応する DESIGN.md ファイルが存在する。

---

## 5. Generator との対応（整合の根拠）

| 本仕様 (公開・オンディスク) | Generator `DESIGN_SECTIONS` (private) |
|---|---|
| frontmatter（`id/jsic/color/mood/…`） | `meta`（`jsicCode/colorId/moodId/version/generatedAt`） |
| H2 セクション `atmosphere` … `agent-guide`（9 個・同一 id・同一順序） | order 2..10 の 9 コンテンツセクション |

セクション `id` と出現順は両リポジトリで一致させる。差異が生じた場合は本書と
Generator 側のセクションスキーマの双方を更新して解消する。
