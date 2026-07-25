import jsic from "@/jsic.json";
import taxonomy from "@/taxonomy.json";
import type { Locale } from "@/lib/i18n";

/** ファセット表示用のラベル（軸コード → 表示名）。 */
export type TaxonomyLabelMaps = {
  jsic: Record<string, string>;
  color: Record<string, string>;
  mood: Record<string, string>;
};

type Named = { name_ja: string; name_en: string };

type JsicNamed = {
  code: string;
  name: string;
  name_en?: string;
  major?: string;
};

/**
 * taxonomy.json / jsic.json からロケール別ラベル表を構築する。
 * フィルタ値（軸コード）自体は変更しない。
 *
 * JSIC EN: 細分類 `name_en` を優先。無い場合は大分類 `name_en` を
 * `${code} · ${major}` 形式でフォールバック（非公式翻訳はしない）。
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

  const majorByCode = new Map(
    (jsic.major as JsicNamed[]).map((m) => [m.code, m]),
  );
  const jsicLabels: Record<string, string> = {};
  for (const item of jsic.subclass as JsicNamed[]) {
    if (locale === "en") {
      if (item.name_en) {
        jsicLabels[item.code] = item.name_en;
      } else {
        const major = item.major ? majorByCode.get(item.major) : undefined;
        jsicLabels[item.code] = major?.name_en
          ? `${item.code} · ${major.name_en}`
          : item.code;
      }
    } else {
      jsicLabels[item.code] = item.name || item.code;
    }
  }
  // 大分類コード自体がファセットに出た場合の表示（通常は細分類）。
  for (const m of jsic.major as JsicNamed[]) {
    jsicLabels[m.code] =
      locale === "en" ? m.name_en || m.name || m.code : m.name || m.code;
  }

  return { jsic: jsicLabels, color, mood };
}

/** チップ等の表示ラベル。未知コードはそのまま返す。 */
export function facetDisplayLabel(
  axis: "jsic" | "color" | "mood" | "tag",
  value: string,
  labels: TaxonomyLabelMaps,
): string {
  if (axis === "jsic") return labels.jsic[value] ?? value;
  if (axis === "color") return labels.color[value] ?? value;
  if (axis === "mood") return labels.mood[value] ?? value;
  return value;
}
