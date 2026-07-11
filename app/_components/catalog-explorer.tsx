"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

/** ブラウズに必要な最小のセル情報（軽量インデックス）。ビルド時に埋め込む。 */
export type CatalogCell = {
  id: string;
  title: string;
  jsic: string;
  color: string;
  mood: string;
  tags: string[];
};

/** 絞り込みの対象となる分類軸。 */
export type Axis = "jsic" | "color" | "mood" | "tag";

const AXES: { key: Axis; label: string }[] = [
  { key: "jsic", label: "業種 (JSIC)" },
  { key: "color", label: "カラー" },
  { key: "mood", label: "ムード" },
  { key: "tag", label: "タグ" },
];

/** セルが軸ごとに持つ値の配列を返す（tag のみ複数値）。 */
function axisValues(cell: CatalogCell, axis: Axis): string[] {
  return axis === "tag" ? cell.tags : [cell[axis]];
}

/** 選択集合の型。空集合はその軸に絞り込みが無いことを表す。 */
type Selected = Record<Axis, Set<string>>;

function emptySelected(): Selected {
  return { jsic: new Set(), color: new Set(), mood: new Set(), tag: new Set() };
}

/**
 * 1 軸ぶんの一致判定。選択が空なら常に一致（無指定）。選択がある場合は
 * セルの当該軸の値と選択集合が交差すれば一致（軸内は OR）。
 */
function axisMatches(cell: CatalogCell, axis: Axis, selected: Set<string>): boolean {
  if (selected.size === 0) return true;
  return axisValues(cell, axis).some((v) => selected.has(v));
}

/** キーワード検索の一致判定（タイトル / id / 各軸値の部分一致・大文字小文字無視）。 */
function queryMatches(cell: CatalogCell, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const haystacks = [cell.title, cell.id, cell.jsic, cell.color, cell.mood, ...cell.tags];
  return haystacks.some((h) => h.toLowerCase().includes(needle));
}

/**
 * `exceptAxis` を除く全軸 + キーワードでの一致判定。
 * ファセット件数（ある軸の候補が示す残件数）を、他軸の絞り込みを反映して
 * 算出するために使う。`exceptAxis` が null なら全軸で判定する。
 */
function matchesExcept(
  cell: CatalogCell,
  selected: Selected,
  query: string,
  exceptAxis: Axis | null,
): boolean {
  for (const { key } of AXES) {
    if (key === exceptAxis) continue;
    if (!axisMatches(cell, key, selected[key])) return false;
  }
  return queryMatches(cell, query);
}

// --- URL クエリ同期（静的エクスポートと両立するため History API を直接使う） ---

const QUERY_PARAM = "q";

function parseUrl(search: string): { selected: Selected; query: string } {
  const params = new URLSearchParams(search);
  const selected = emptySelected();
  for (const { key } of AXES) {
    const raw = params.get(key);
    if (raw) {
      for (const v of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
        selected[key].add(v);
      }
    }
  }
  return { selected, query: params.get(QUERY_PARAM) ?? "" };
}

function buildSearch(selected: Selected, query: string): string {
  const params = new URLSearchParams();
  for (const { key } of AXES) {
    const values = [...selected[key]];
    if (values.length > 0) params.set(key, values.join(","));
  }
  if (query.trim()) params.set(QUERY_PARAM, query.trim());
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function CatalogExplorer({ cells }: { cells: CatalogCell[] }) {
  const [selected, setSelected] = useState<Selected>(emptySelected);
  const [query, setQuery] = useState("");

  // マウント後に URL クエリから初期状態を復元（共有リンクの反映）。
  // 初回レンダは無フィルタ（= サーバ生成 HTML と一致）にしてハイドレーション不整合を避ける。
  useEffect(() => {
    const { selected: s, query: q } = parseUrl(window.location.search);
    setSelected(s);
    setQuery(q);
  }, []);

  // 状態変化を URL に反映（履歴を汚さない replaceState）。
  useEffect(() => {
    const search = buildSearch(selected, query);
    const url = `${window.location.pathname}${search}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, [selected, query]);

  const toggle = useCallback((axis: Axis, value: string) => {
    setSelected((prev) => {
      const next: Selected = {
        jsic: new Set(prev.jsic),
        color: new Set(prev.color),
        mood: new Set(prev.mood),
        tag: new Set(prev.tag),
      };
      if (next[axis].has(value)) next[axis].delete(value);
      else next[axis].add(value);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSelected(emptySelected());
    setQuery("");
  }, []);

  const activeCount = useMemo(
    () =>
      AXES.reduce((n, { key }) => n + selected[key].size, 0) +
      (query.trim() ? 1 : 0),
    [selected, query],
  );

  // 絞り込み後のセル一覧。
  const filtered = useMemo(
    () => cells.filter((c) => matchesExcept(c, selected, query, null)),
    [cells, selected, query],
  );

  // 軸ごとのファセット候補と、他軸フィルタを反映した残件数。
  // 件数 0（かつ未選択）の候補は選べないものとして無効化する。
  const facets = useMemo(() => {
    const result: Record<Axis, { value: string; count: number }[]> = {
      jsic: [],
      color: [],
      mood: [],
      tag: [],
    };
    for (const { key } of AXES) {
      const counts = new Map<string, number>();
      // 全セルから当該軸の候補値を洗い出す（母集合は固定）。
      for (const cell of cells) {
        for (const v of axisValues(cell, key)) {
          if (!counts.has(v)) counts.set(v, 0);
        }
      }
      // 他軸フィルタ + 検索を満たすセルで件数を数える。
      for (const cell of cells) {
        if (!matchesExcept(cell, selected, query, key)) continue;
        for (const v of new Set(axisValues(cell, key))) {
          counts.set(v, (counts.get(v) ?? 0) + 1);
        }
      }
      result[key] = [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    }
    return result;
  }, [cells, selected, query]);

  return (
    <>
      <section className="section" aria-labelledby="axes-heading">
        <h2 id="axes-heading">分類軸で絞り込む</h2>
        <p className="lead">
          値集合の SSOT は{" "}
          <a href="https://github.com/AutoDevJapan/GoDD-Design-Systems/blob/main/taxonomy.md">
            taxonomy.md
          </a>{" "}
          で定義。チップを押すと下のカタログを絞り込みます（同一軸内は
          OR、軸をまたぐと AND）。件数は現在の絞り込みでの残件数です。
        </p>
        <div className="facets">
          {AXES.map(({ key, label }) => (
            <div className="facet" key={key}>
              <h3 id={`facet-${key}`}>{label}</h3>
              <div
                className="chips"
                role="group"
                aria-labelledby={`facet-${key}`}
              >
                {facets[key].map((f) => {
                  const isSelected = selected[key].has(f.value);
                  const disabled = f.count === 0 && !isSelected;
                  return (
                    <button
                      type="button"
                      className={`chip chip-btn${isSelected ? " is-selected" : ""}`}
                      key={f.value}
                      aria-pressed={isSelected}
                      aria-label={`${label} ${f.value}（${f.count} 件）`}
                      disabled={disabled}
                      onClick={() => toggle(key, f.value)}
                    >
                      {f.value}
                      <span className="count">{f.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="cells-heading">
        <h2 id="cells-heading">カタログ</h2>
        <div className="toolbar">
          <div className="search">
            <label htmlFor="cell-search" className="search-label">
              セルを検索
            </label>
            <input
              id="cell-search"
              type="search"
              className="search-input"
              placeholder="タイトル / タグ / 軸で検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="toolbar-status">
            <p className="result-count" role="status" aria-live="polite">
              {filtered.length} / {cells.length} 件
            </p>
            {activeCount > 0 ? (
              <button type="button" className="clear-btn" onClick={clearAll}>
                絞り込みをクリア
              </button>
            ) : null}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="cards">
            {filtered.map((entry) => (
              <Link
                className="card"
                key={entry.id}
                href={`/cells/${entry.id}/`}
              >
                <p className="title">{entry.title}</p>
                <div className="meta">
                  <span className="chip">{entry.jsic}</span>
                  <span className="chip">{entry.color}</span>
                  <span className="chip">{entry.mood}</span>
                </div>
                <div className="tags">{entry.tags.join(" · ")}</div>
                <div className="id">{entry.id}</div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty" role="status">
            条件に一致するセルがありません。
            <button type="button" className="clear-btn inline" onClick={clearAll}>
              絞り込みをクリア
            </button>
          </p>
        )}
      </section>
    </>
  );
}
