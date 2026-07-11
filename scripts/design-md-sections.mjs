// DESIGN.md の正規セクション定義（オンディスク Markdown 形式の単一情報源）。
//
// Generator (private) の 10 セクションスキーマ（src/schema/sections.ts の
// DESIGN_SECTIONS）と整合する。Generator は「meta + 9 コンテンツ」を構造化
// ドキュメントとして持つが、本公開リポジトリでは:
//   - meta セクション  → DESIGN.md 冒頭の frontmatter（--- で囲む）に対応。
//   - 9 コンテンツ     → 本文の H2 見出しセクションに対応（順序固定）。
//
// canonical な H2 見出しは `## {ja} / {id}` 形式（例 `## アトモスフィア / atmosphere`）。
// 検証スクリプトは末尾の英字 id で機械照合するため、この形式を厳守する。
//
// 契約: id は安定キー（Generator の partial ディレクトリ名と対応）。一度公開したら変更しない。

/**
 * @typedef {Object} DesignSection
 * @property {string} id       安定 ID（Generator セクション ID と一致）。
 * @property {number} order    本文中の出現順（1..9）。
 * @property {string} ja       H2 見出しに使う日本語表示名。
 * @property {string} summary  セクションの役割（日本語）。
 * @property {string[]} expects  本文に含めることが推奨される要素（Generator の必須フィールド由来）。
 */

/**
 * DESIGN.md 本文の 9 コンテンツセクション（frontmatter=meta を除く）。
 * @type {readonly DesignSection[]}
 */
export const DESIGN_MD_SECTIONS = [
  {
    id: "atmosphere",
    order: 1,
    ja: "アトモスフィア",
    summary: "デザインコンセプト・キーワード・トーン。",
    expects: ["concept", "keywords", "toneOfVoice"],
  },
  {
    id: "color-system",
    order: 2,
    ja: "カラーシステム",
    summary: "役割ベースのパレットとコントラスト指針。",
    expects: ["palette", "contrastNotes"],
  },
  {
    id: "typography",
    order: 3,
    ja: "タイポグラフィ",
    summary: "書体・タイプスケール・ウェイト（オープンフォントのみ）。",
    expects: ["headingFont", "bodyFont", "scale", "weights"],
  },
  {
    id: "spacing-layout",
    order: 4,
    ja: "余白とレイアウト",
    summary: "余白スケール・グリッド・コンテナ幅。",
    expects: ["spacingScale", "grid", "containerWidths"],
  },
  {
    id: "depth-shadow",
    order: 5,
    ja: "奥行きとシャドウ",
    summary: "エレベーション・シャドウ・角丸トークン。",
    expects: ["elevations", "shadows", "radii"],
  },
  {
    id: "components",
    order: 6,
    ja: "コンポーネント",
    summary: "コンポーネント在庫（1 件以上）。",
    expects: ["inventory"],
  },
  {
    id: "guardrails",
    order: 7,
    ja: "ガードレール",
    summary: "推奨/禁止とアクセシビリティ要件。",
    expects: ["dos", "donts", "accessibility"],
  },
  {
    id: "responsive",
    order: 8,
    ja: "レスポンシブ",
    summary: "ブレークポイントと挙動指針。",
    expects: ["breakpoints", "notes"],
  },
  {
    id: "agent-guide",
    order: 9,
    ja: "エージェントガイド",
    summary: "生成エージェントへの注入・制約指針。",
    expects: ["usage", "injection", "constraints"],
  },
];

/** canonical な H2 見出し文字列（`## {ja} / {id}`）を返す。 */
export function sectionHeading(section) {
  return `${section.ja} / ${section.id}`;
}
