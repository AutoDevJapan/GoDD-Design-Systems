# taxonomy.md — color / mood 分類語彙

本ドキュメントは GoDD-Design-Systems のディレクトリ構造
`design-md/{jsic-code}/{color}/{mood}/` で用いる **`color`** と **`mood`** の
値集合を定義する単一情報源 (SSOT) である。

- 業種軸 (`jsic-code`) は `jsic.json` を出典とし本書の対象外。
- 本書は SSOT 仕様 `DESIGN-PROMPT-EMPIRE-SPEC.md` §2 に準拠する。
- 追加・変更はすべて本書を更新してから反映すること。

---

## 0. slug 命名規則

`color` / `mood` の値 (slug) はディレクトリ名・URL の一部になるため、以下を厳守する。

- 使用可能文字は **小文字英数字とハイフン (`[a-z0-9-]`)** のみ。
- 先頭・末尾をハイフンにしない。ハイフンの連続を禁止。
- 空白・アンダースコア・全角文字・大文字を含めない。
- 一度公開した slug は**不変**とする (URL 安定性のため)。改名は非推奨、必要時は別 slug を新設し旧 slug を alias 表に残す。
- slug は本書に列挙されたものだけを正とする。未定義値をディレクトリに使わない。
- 機械検証用の正規表現: 個々の slug 部品は `^[a-z0-9]+$`、連結後の値は `^[a-z0-9]+(-[a-z0-9]+)*$` を満たす。CI で本規則を検証できる。

---

## 1. color

カラー軸は **PCCS (Practical Color Co-ordinate System / 日本色研配色体系)** の
24 色相 × トーンと、**無彩色 (JIS Z 8721 系の N スケール)** で構成する。
出典: 一般財団法人 日本色彩研究所 PCCS / JIS。特定製品・ブランドの色名は用いない (§8 法務)。

color 値は次のいずれかの形をとる。

- **有彩色**: `{tone-slug}-{hue-slug}` 例: `v-h02` (vivid red)
- **無彩色**: `ac-` + 段階 slug 例: `ac-mgy`

有彩色は 24 色相 × 12 トーン = **288 通り**で、格子は全て材化対象とする。無彩色 5 を加えた
**293** が現行の color 語彙である。どの組合せを実際に材化したかは `index.json` 側で管理し、
本書は語彙のみを定義する。

かつては有彩色を `{hue-slug}-{tone-slug}`（例: `h17b-lt`）、無彩色を段階 slug そのまま
（例: `gray`）としていた。§0 の「一度公開した slug は不変」に従い、旧 slug は §4 の alias 表に
残して削除しない。**新規材化では旧 slug を使わない。**

### 1.1 hue (色相) — 24

slug は `h` + PCCS 番号 2桁とする。PCCS では略号が一部重複する (14/15 = BG, 17/18 = B) ため、
番号だけで一意性を担保する。

| slug | PCCS No. | 略号 | 英名 | 主要色相の目安 |
|---|---|---|---|---|
| `h01` | 1 | pR | purplish red | 赤紫寄りの赤 |
| `h02`  | 2 | R | red | 赤 (心理四原色) |
| `h03` | 3 | yR | yellowish red | 黄み赤 |
| `h04` | 4 | rO | reddish orange | 赤みオレンジ |
| `h05`  | 5 | O | orange | オレンジ |
| `h06` | 6 | yO | yellowish orange | 黄みオレンジ |
| `h07` | 7 | rY | reddish yellow | 赤み黄 |
| `h08`  | 8 | Y | yellow | 黄 (心理四原色) |
| `h09` | 9 | gY | greenish yellow | 緑み黄 |
| `h10` | 10 | YG | yellow green | 黄緑 |
| `h11`| 11 | yG | yellowish green | 黄み緑 |
| `h12`  | 12 | G | green | 緑 (心理四原色) |
| `h13` | 13 | bG | bluish green | 青み緑 |
| `h14`| 14 | BG | blue green | 青緑 |
| `h15`| 15 | BG | blue green | 青緑 (寒色寄り) |
| `h16` | 16 | gB | greenish blue | 緑み青 |
| `h17`  | 17 | B | blue | 青 |
| `h18` | 18 | B | blue | 青 (心理四原色) |
| `h19` | 19 | pB | purplish blue | 紫み青 |
| `h20`  | 20 | V | violet | 青紫 |
| `h21` | 21 | bP | bluish purple | 青み紫 |
| `h22`  | 22 | P | purple | 紫 |
| `h23` | 23 | rP | reddish purple | 赤み紫 |
| `h24`| 24 | RP | red purple | 赤紫 |

> 補足: PCCS では略号が一部重複する (14/15 = BG, 17/18 = B)。slug は番号を含めることで一意性を担保している。

### 1.2 tone (トーン) — 12

明度・彩度による色調グループ。無彩色には適用しない。

| slug | 略号 | 名称 | 概要 |
|---|---|---|---|
| `v`   | v   | vivid | 純色に近い最も鮮やかな調子 |
| `b`   | b   | bright | 明るく鮮やか |
| `s`   | s   | strong | 強く濃い中明度の鮮やか |
| `dp`  | dp  | deep | 深く濃い高彩度 |
| `lt`  | lt  | light | 明るく澄んだ |
| `sf`  | sf  | soft | 柔らかく穏やか |
| `d`   | d   | dull | くすんだ中間 |
| `dk`  | dk  | dark | 暗く濃い |
| `p`   | p   | pale | ごく淡い |
| `ltg` | ltg | light grayish | 明るい灰み |
| `g`   | g   | grayish | 灰み |
| `dkg` | dkg | dark grayish | 暗い灰み |

### 1.3 achromatic (無彩色) — 5

JIS の無彩色 (N) スケールに基づく段階。段階数は暫定 5（仕様の未確定事項: 3 or 5）。
無彩色はトーンを持たないため、**tone-slug を付けず `ac-` + 段階 slug を color 値とする**。

| slug | 名称 | 目安 (明度 N) | 旧 slug |
|---|---|---|---|
| `ac-w`    | 白 | N9.5 付近 | `white` |
| `ac-ltgy` | 明灰 | N7-8 | `gray-light` |
| `ac-mgy`  | 中灰 | N5 | `gray` |
| `ac-dkgy` | 暗灰 | N3 | `gray-dark` |
| `ac-bk`   | 黒 | N1 付近 | `black` |

> 3 段階運用に切替える場合は `ac-w` / `ac-mgy` / `ac-bk` を採用し、`ac-ltgy` / `ac-dkgy` を alias とする。

---

## 2. mood

mood は 6 つの観点 (energy / temperature / formality / personality / era / emotion) を
横断する定義済み語彙。仕様上の目標数は約 50。1 セルには通常 mood を 1 つ割り当てる
(複合ニュアンスは `index.json` の `tags` に逃がす)。

### 2.1 energy (エネルギー) — 8

| slug | 名称 | 定義 |
|---|---|---|
| `calm`      | 静穏 | 落ち着き・鎮静。動きを抑えた基調 |
| `serene`    | 静謐 | 澄んで穏やか。緊張のない静けさ |
| `gentle`    | 穏和 | やわらかく控えめな活力 |
| `dynamic`   | 躍動 | 動きと勢いを感じさせる |
| `energetic` | 活発 | 高い活動量・前向きな推進力 |
| `vibrant`   | 鮮烈 | 生き生きと鮮やか |
| `bold`      | 大胆 | 強い主張・コントラスト |
| `intense`   | 強烈 | 濃密で圧の強い緊張感 |

### 2.2 temperature (温度) — 6

| slug | 名称 | 定義 |
|---|---|---|
| `warm`      | 温 | 暖色基調のあたたかさ |
| `cozy`      | 親密温 | 包み込むような居心地の良さ |
| `neutral`   | 中庸 | 寒暖に偏らない中立 |
| `fresh`     | 清爽 | みずみずしく爽やか |
| `cool`      | 涼 | 寒色基調の落ち着き |
| `icy`       | 冷徹 | 硬質で冷たい透明感 |

### 2.3 formality (格) — 8

| slug | 名称 | 定義 |
|---|---|---|
| `casual`      | カジュアル | 気取らず親しみやすい |
| `friendly`    | フレンドリー | 開かれた親近感 |
| `refined`     | 洗練 | 端正で無駄がない |
| `elegant`     | 優雅 | 気品と上品さ |
| `premium`     | プレミアム | 上位・特別感 |
| `luxurious`   | 高級 | 贅を感じさせる豪奢さ |
| `understated` | 抑制 | 控えめで慎ましい上質 |
| `prestige`    | 権威 | 格式・信頼・重厚 |

### 2.4 personality (性格) — 10

| slug | 名称 | 定義 |
|---|---|---|
| `minimal`     | ミニマル | 要素を削ぎ落とした簡潔さ |
| `maximal`     | マキシマル | 情報量・装飾の豊かさ |
| `geometric`   | 幾何 | 直線・図形的な秩序 |
| `organic`     | 有機的 | 曲線・自然由来のやわらかさ |
| `industrial`  | 無骨 | 機能本位・素材感 |
| `handcrafted` | 手仕事 | 手作りの温度・不均質さ |
| `playful`     | 遊戯的 | 楽しさ・軽やかな遊び |
| `serious`     | 真面目 | 誠実で堅実 |
| `professional`| 専門的 | 実務的で信頼できる |
| `technical`   | 技術的 | 精密・データ的な緻密さ |

### 2.5 era (時代) — 8

| slug | 名称 | 定義 |
|---|---|---|
| `modern`       | モダン | 現代的で機能美 |
| `contemporary` | コンテンポラリー | 今日的・トレンド感 |
| `futuristic`   | 近未来 | 先進・SF 的 |
| `timeless`     | 普遍 | 流行に依らない不変性 |
| `classic`      | クラシック | 伝統的で正統 |
| `vintage`      | ヴィンテージ | 年代物の味わい |
| `retro`        | レトロ | 過去様式の再解釈 |
| `nostalgic`    | 郷愁 | 懐かしさ・情感 |

### 2.6 emotion (情緒) — 10

| slug | 名称 | 定義 |
|---|---|---|
| `joyful`        | 歓喜 | 明るく楽しい高揚 |
| `optimistic`    | 楽観 | 前向きで希望的 |
| `trustworthy`   | 信頼 | 安心・誠実 |
| `confident`     | 自信 | 堂々とした力強さ |
| `sophisticated` | 洗練情緒 | 大人びた知的さ |
| `dramatic`      | ドラマティック | 劇的で高低差のある演出 |
| `mysterious`    | 神秘 | 陰影・奥行きのある謎めき |
| `romantic`      | ロマンティック | 甘美でやわらかな情感 |
| `wabi-sabi`     | 侘寂 | 簡素・不完全・経年の美 |
| `zen`           | 禅 | 余白と静寂の精神性 |

---

## 3. 集計

- color: 有彩色 hue 24 × tone 12 = **288**（格子は全て材化対象）+ 無彩色 **5** = **293**。
  これに §4 の旧 slug alias 6 件を加えた 299 件を `taxonomy.json` が保持する。
- mood: 8 + 6 + 8 + 10 + 8 + 10 = **50**。

## 4. alias 表

改名・段階変更時の後方互換用。旧 slug は §0 に従い削除せず維持する。新規材化では使わない。

| 旧 slug | 新 slug | 種別 | 備考 |
|---|---|---|---|
| `h17b-lt` | `lt-h17` | color | 有彩色の旧 `{hue}-{tone}` 形式。公開済みセルが使用中 |
| `white` | `ac-w` | color | 無彩色の旧 slug |
| `gray-light` | `ac-ltgy` | color | 無彩色の旧 slug |
| `gray` | `ac-mgy` | color | 無彩色の旧 slug |
| `gray-dark` | `ac-dkgy` | color | 無彩色の旧 slug |
| `black` | `ac-bk` | color | 無彩色の旧 slug |

---

出典 / 参考:
- PCCS: 一般財団法人 日本色彩研究所 (Practical Color Co-ordinate System)。
- 無彩色段階: JIS 色名・明度 (N) スケール。
- 業種軸 JSIC: e-Stat / 総務省 (`jsic.json` の NOTICE を参照)。
