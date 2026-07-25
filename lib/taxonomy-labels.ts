import taxonomy from "@/taxonomy.json";
import type { Locale } from "@/lib/i18n";

/** ファセット表示用の色・ムードラベル（軸コード → 表示名）。 */
export type TaxonomyLabelMaps = {
  color: Record<string, string>;
  mood: Record<string, string>;
};

type Named = { name_ja: string; name_en: string };

/**
 * taxonomy.json の `name_ja` / `name_en` からロケール別ラベル表を構築する。
 * フィルタ値（軸コード）自体は変更しない。JSIC は name_en 未整備のため対象外。
 */
export function taxonomyLabelsFor(locale: Locale): TaxonomyLabelMaps {
  const key = locale === "en" ? "name_en" : "name_ja";
  const color: Record<string, string> = {};
  const mood: Record<string, string> = {};
  for (const [code, meta] of Object.entries(taxonomy.colors as Record<string, Named>)) {
    color[code] = meta[key] || code;
  }
  for (const [code, meta] of Object.entries(taxonomy.moods as Record<string, Named>)) {
    mood[code] = meta[key] || code;
  }
  return { color, mood };
}

/** チップ等の表示ラベル。未知コードはそのまま返す。 */
export function facetDisplayLabel(
  axis: "jsic" | "color" | "mood" | "tag",
  value: string,
  labels: TaxonomyLabelMaps,
): string {
  if (axis === "color") return labels.color[value] ?? value;
  if (axis === "mood") return labels.mood[value] ?? value;
  return value;
}
