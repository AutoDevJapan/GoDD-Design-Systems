"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cellPath,
  displayTitle,
  fillTemplate,
  type Locale,
  type UiMessages,
} from "@/lib/i18n";
import {
  facetDisplayLabel,
  type TaxonomyLabelMaps,
} from "@/lib/taxonomy-labels";
import { githubBlobUrl } from "@/lib/site-urls";

/** ブラウズに必要な最小のセル情報（軽量インデックス）。ビルド時に埋め込む。 */
export type CatalogCell = {
  id: string;
  title: string;
  titleEn?: string;
  jsic: string;
  color: string;
  mood: string;
  tags: string[];
  /**
   * 詳細への明示 href。未設定時は `cellPath(id, locale)`。
   * Pages remote 取得時は GitHub blob URL。
   */
  href?: string;
};

/** 絞り込みの対象となる分類軸。 */
export type Axis = "jsic" | "color" | "mood" | "tag";

const AXIS_KEYS: Axis[] = ["jsic", "color", "mood", "tag"];

function axisLabels(messages: UiMessages): Record<Axis, string> {
  return {
    jsic: messages.axisJsic,
    color: messages.axisColor,
    mood: messages.axisMood,
    tag: messages.axisTag,
  };
}

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

/** キーワード検索の一致判定（タイトル / id / 各軸値・表示ラベルの部分一致）。 */
function queryMatches(
  cell: CatalogCell,
  q: string,
  locale: Locale,
  labels: TaxonomyLabelMaps,
): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const title = displayTitle(cell, locale);
  const haystacks = [
    title,
    cell.title,
    cell.titleEn ?? "",
    cell.id,
    cell.jsic,
    cell.color,
    cell.mood,
    facetDisplayLabel("jsic", cell.jsic, labels),
    facetDisplayLabel("color", cell.color, labels),
    facetDisplayLabel("mood", cell.mood, labels),
    ...cell.tags,
  ];
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
  locale: Locale,
  labels: TaxonomyLabelMaps,
): boolean {
  for (const key of AXIS_KEYS) {
    if (key === exceptAxis) continue;
    if (!axisMatches(cell, key, selected[key])) return false;
  }
  return queryMatches(cell, query, locale, labels);
}

// --- URL クエリ同期（静的エクスポートと両立するため History API を直接使う） ---

const QUERY_PARAM = "q";

function parseUrl(search: string): { selected: Selected; query: string } {
  const params = new URLSearchParams(search);
  const selected = emptySelected();
  for (const key of AXIS_KEYS) {
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
  for (const key of AXIS_KEYS) {
    const values = [...selected[key]];
    if (values.length > 0) params.set(key, values.join(","));
  }
  if (query.trim()) params.set(QUERY_PARAM, query.trim());
  const s = params.toString();
  return s ? `?${s}` : "";
}

type RemoteIndexEntry = {
  id: string;
  title: string;
  titleEn?: string;
  jsic: string;
  color: string;
  mood: string;
  tags?: string[];
  path: string;
};

export function CatalogExplorer({
  cells: initialCells,
  messages,
  locale,
  taxonomyLabels,
  remoteIndexUrl,
}: {
  cells: CatalogCell[];
  messages: UiMessages;
  locale: Locale;
  taxonomyLabels: TaxonomyLabelMaps;
  /** 指定時はマウント後に remote index.json を fetch（Pages 軽量化）。 */
  remoteIndexUrl?: string;
}) {
  const labels = axisLabels(messages);
  const [cells, setCells] = useState<CatalogCell[]>(initialCells);
  const [remoteStatus, setRemoteStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >(remoteIndexUrl ? "loading" : "idle");
  const [selected, setSelected] = useState<Selected>(emptySelected);
  const [query, setQuery] = useState("");

  // Pages: raw index.json をクライアント取得（静的 HTML 肥大化を避ける）。
  useEffect(() => {
    if (!remoteIndexUrl) return;
    let cancelled = false;
    setRemoteStatus("loading");
    (async () => {
      try {
        const res = await fetch(remoteIndexUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { entries: RemoteIndexEntry[] };
        if (cancelled) return;
        setCells(
          data.entries.map((e) => ({
            id: e.id,
            title: e.title,
            titleEn: e.titleEn,
            jsic: e.jsic,
            color: e.color,
            mood: e.mood,
            tags: e.tags ?? [],
            href: githubBlobUrl(e.path),
          })),
        );
        setRemoteStatus("ready");
      } catch {
        if (!cancelled) setRemoteStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [remoteIndexUrl]);

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
      AXIS_KEYS.reduce((n, key) => n + selected[key].size, 0) +
      (query.trim() ? 1 : 0),
    [selected, query],
  );

  // 絞り込み後のセル一覧。
  const filtered = useMemo(
    () =>
      cells.filter((c) =>
        matchesExcept(c, selected, query, null, locale, taxonomyLabels),
      ),
    [cells, selected, query, locale, taxonomyLabels],
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
    for (const key of AXIS_KEYS) {
      const counts = new Map<string, number>();
      // 全セルから当該軸の候補値を洗い出す（母集合は固定）。
      for (const cell of cells) {
        for (const v of axisValues(cell, key)) {
          if (!counts.has(v)) counts.set(v, 0);
        }
      }
      // 他軸フィルタ + 検索を満たすセルで件数を数える。
      for (const cell of cells) {
        if (!matchesExcept(cell, selected, query, key, locale, taxonomyLabels)) {
          continue;
        }
        for (const v of new Set(axisValues(cell, key))) {
          counts.set(v, (counts.get(v) ?? 0) + 1);
        }
      }
      result[key] = [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    }
    return result;
  }, [cells, selected, query, locale, taxonomyLabels]);

  return (
    <>
      <section className="section" aria-labelledby="axes-heading">
        <h2 id="axes-heading">{messages.axesHeading}</h2>
        <p className="lead">
          {messages.axesLeadBefore}
          <a href="https://github.com/AutoDevJapan/GoDD-Design-Systems/blob/main/taxonomy.md">
            taxonomy.md
          </a>
          {messages.axesLeadAfter}
        </p>
        <div className="facets">
          {AXIS_KEYS.map((key) => {
            const label = labels[key];
            return (
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
                    const display = facetDisplayLabel(key, f.value, taxonomyLabels);
                    return (
                      <button
                        type="button"
                        className={`chip chip-btn${isSelected ? " is-selected" : ""}`}
                        key={f.value}
                        aria-pressed={isSelected}
                        aria-label={fillTemplate(messages.chipAriaTemplate, {
                          label,
                          value: display,
                          count: f.count,
                        })}
                        title={display !== f.value ? f.value : undefined}
                        disabled={disabled}
                        onClick={() => toggle(key, f.value)}
                      >
                        {display}
                        <span className="count">{f.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section" aria-labelledby="cells-heading">
        <h2 id="cells-heading">{messages.catalogHeading}</h2>
        {remoteStatus === "loading" ? (
          <p className="empty" role="status">
            {messages.catalogLoading}
          </p>
        ) : null}
        {remoteStatus === "error" ? (
          <p className="empty" role="alert">
            {messages.catalogLoadError}
          </p>
        ) : null}
        <div className="toolbar">
          <div className="search">
            <label htmlFor="cell-search" className="search-label">
              {messages.searchLabel}
            </label>
            <input
              id="cell-search"
              type="search"
              className="search-input"
              placeholder={messages.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="toolbar-status">
            <p className="result-count" role="status" aria-live="polite">
              {fillTemplate(messages.resultCountTemplate, {
                filtered: filtered.length,
                total: cells.length,
              })}
            </p>
            {activeCount > 0 ? (
              <button type="button" className="clear-btn" onClick={clearAll}>
                {messages.clearFilters}
              </button>
            ) : null}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="cards">
            {filtered.map((entry) => {
              const href = entry.href ?? cellPath(entry.id, locale);
              const external = /^https?:\/\//i.test(href);
              const jsicLabel = facetDisplayLabel(
                "jsic",
                entry.jsic,
                taxonomyLabels,
              );
              const body = (
                <>
                  <p className="title">{displayTitle(entry, locale)}</p>
                  <div className="meta">
                    <span
                      className="chip"
                      title={jsicLabel !== entry.jsic ? entry.jsic : undefined}
                    >
                      {jsicLabel}
                    </span>
                    <span className="chip" title={entry.color}>
                      {facetDisplayLabel("color", entry.color, taxonomyLabels)}
                    </span>
                    <span className="chip" title={entry.mood}>
                      {facetDisplayLabel("mood", entry.mood, taxonomyLabels)}
                    </span>
                  </div>
                  <div className="tags">{entry.tags.join(" · ")}</div>
                  <div className="id">{entry.id}</div>
                </>
              );
              return external ? (
                <a
                  className="card"
                  key={entry.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {body}
                </a>
              ) : (
                <Link className="card" key={entry.id} href={href}>
                  {body}
                </Link>
              );
            })}
          </div>
        ) : remoteStatus === "loading" || remoteStatus === "error" ? null : (
          <p className="empty" role="status">
            {messages.emptyResults}
            <button type="button" className="clear-btn inline" onClick={clearAll}>
              {messages.clearFilters}
            </button>
          </p>
        )}
      </section>
    </>
  );
}
