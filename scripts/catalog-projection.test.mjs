import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);
function loadSource(path, resolve) {
  const source = readFileSync(new URL(path, root), "utf8");
  return loadText(source, resolve, path);
}
function loadText(source, resolve, fileName = "catalog-explorer.tsx") {
  const compiled = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  });
  assert.deepEqual((compiled.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error), []);
  const module = { exports: {} };
  const run = vm.runInNewContext("(function(require,module,exports){" + compiled.outputText + "\n})", {});
  run(resolve, module, module.exports);
  return module.exports;
}
const missing = (name) => { throw new Error("unexpected dependency: " + name); };
const i18n = loadSource("lib/i18n.ts", missing);
const taxonomy = loadSource("lib/taxonomy-labels.ts", (name) => {
  if (name === "@/jsic.json") return { major: [], subclass: [] };
  if (name === "@/taxonomy.json") return { colors: {}, moods: {} };
  return missing(name);
});
function resolveComponent(name) {
  if (name === "@/lib/i18n") return i18n;
  if (name === "@/lib/taxonomy-labels") return taxonomy;
  if (name === "@/lib/site-urls") return { githubBlobUrl: (p) => p };
  if (name === "next/link") return () => null;
  if (name === "react") return {};
  if (name === "react/jsx-runtime") return { jsx() {}, jsxs() {}, Fragment: Symbol("fragment") };
  return missing(name);
}
const componentSource = readFileSync(new URL("app/_components/catalog-explorer.tsx", root), "utf8");
const { computeCatalogProjection } = loadText(componentSource, resolveComponent);
assert.equal(typeof computeCatalogProjection, "function");

// These tests pin what computeCatalogProjection returns: results, facet values, counts and their order. Nothing here measures time.
const axes = ["jsic", "color", "mood", "tag"];
const selected = (values = {}) => Object.fromEntries(axes.map((key) => [key, new Set(values[key] ?? [])]));
const labels = { jsic: { J0: "農業", J1: "飲食", J2: "店舗" }, color: { C0: "青", C1: "赤" }, mood: { M0: "静寂", M1: "明朗" } };
const cells = [
  { id: "alpha", title: "水と光", titleEn: "Water Light", jsic: "J0", color: "C0", mood: "M0", tags: ["重複", "重複"] },
  { id: "beta", title: "赤い店", titleEn: "Red Shop", jsic: "J1", color: "C1", mood: "M1", tags: ["店舗"] },
  { id: "gamma", title: "水 店", jsic: "J1", color: "C0", mood: "M1", tags: ["店舗", "重複"] },
  { id: "delta", title: "Space Title", titleEn: "", jsic: "J2", color: "C0", mood: "M0", tags: [] },
];
const orderRows = [
  { id: "a", title: "a", jsic: "J1", color: "C0", mood: "M0", tags: ["tagB", "tagA", "tagB"] },
  { id: "b", title: "b", jsic: "J1", color: "C0", mood: "M1", tags: ["tagA"] },
  { id: "c", title: "c", jsic: "J0", color: "C0", mood: "M0", tags: ["tagB"] },
  { id: "d", title: "d", jsic: "J2", color: "C1", mood: "M1", tags: ["tagC"] },
];
const plain = (value) => JSON.parse(JSON.stringify(value));
const ids = (result) => plain(result.filtered.map((cell) => cell.id));
const count = (result, axis, value) => result.facets[axis].find((entry) => entry.value === value)?.count;

// The three mutation controls below patch the component source by exact text. The text must occur exactly once.
// If it does not, the component was reformatted or renamed: update the text here together with it, because the
// control is what proves that the neighbouring assertions can fail.
const mutate = (from, to) => {
  assert.equal(
    componentSource.split(from).length,
    2,
    "mutation text must occur exactly once in catalog-explorer.tsx (reformatted or renamed? update the text here): " + from,
  );
  return loadText(componentSource.replace(from, () => to), resolveComponent).computeCatalogProjection;
};

test("full results and repeated tags retain item-level counts", () => {
  const before = JSON.stringify(cells);
  const result = computeCatalogProjection(cells, selected(), "", "ja", labels);
  assert.deepEqual(ids(result), ["alpha", "beta", "gamma", "delta"]);
  assert.equal(count(result, "tag", "重複"), 2);
  assert.equal(count(result, "tag", "店舗"), 2);
  assert.equal(JSON.stringify(cells), before);
});

test("OR within an axis, AND across axes and facet exclusion are preserved", () => {
  const selection = selected({ jsic: ["J0", "J1"], color: ["C0"] });
  const before = JSON.stringify(axes.map((axis) => [...selection[axis]]));
  const result = computeCatalogProjection(cells, selection, "", "ja", labels);
  assert.deepEqual(ids(result), ["alpha", "gamma"]);
  assert.equal(count(result, "jsic", "J2"), 1);
  assert.equal(count(result, "color", "C0"), 2);
  assert.equal(count(result, "color", "C1"), 1);
  assert.equal(count(result, "tag", "重複"), 2);
  assert.deepEqual(plain(result.facets.mood), [{ value: "M0", count: 1 }, { value: "M1", count: 1 }]);
  assert.equal(JSON.stringify(axes.map((axis) => [...selection[axis]])), before);
});

test("title and label search, unknown selected values and empty input stay correct", () => {
  assert.deepEqual(ids(computeCatalogProjection(cells, selected(), "WATER", "en", labels)), ["alpha"]);
  assert.deepEqual(ids(computeCatalogProjection(cells, selected(), "水", "en", labels)), ["alpha", "gamma"]);
  assert.deepEqual(ids(computeCatalogProjection(cells, selected(), "農業", "ja", labels)), ["alpha"]);
  const none = computeCatalogProjection(cells, selected({ jsic: ["missing"] }), "", "ja", labels);
  assert.equal(none.filtered.length, 0);
  assert.equal(count(none, "jsic", "J1"), 2);
  assert.equal(count(none, "color", "C0"), 0);
  assert.equal(computeCatalogProjection([], selected(), "", "ja", labels).filtered.length, 0);
});

test("one-axis mismatch mutation is detected by the facet control", () => {
  const mutant = mutate("if (failures > 1 || !queryMatches", "if (failures > 0 || !queryMatches");
  const selection = selected({ jsic: ["J0"] });
  assert.equal(count(computeCatalogProjection(cells, selection, "", "ja", labels), "jsic", "J1"), 2);
  assert.equal(count(mutant(cells, selection, "", "ja", labels), "jsic", "J1"), 0);
});

test("facet arrays retain count order and stable value tie-breaks", () => {
  const expected = {
    jsic: [{ value: "J1", count: 2 }, { value: "J0", count: 1 }, { value: "J2", count: 1 }],
    color: [{ value: "C0", count: 3 }, { value: "C1", count: 1 }],
    mood: [{ value: "M0", count: 2 }, { value: "M1", count: 2 }],
    tag: [{ value: "tagA", count: 2 }, { value: "tagB", count: 2 }, { value: "tagC", count: 1 }],
  };
  const actual = computeCatalogProjection(orderRows, selected(), "", "ja", labels);
  assert.deepEqual(plain(actual.facets), expected);
  const mutant = mutate("a.value.localeCompare(b.value)", "b.value.localeCompare(a.value)");
  const changed = mutant(orderRows, selected(), "", "ja", labels);
  assert.notDeepEqual(plain(changed.facets), expected);
  assert.deepEqual(plain(changed.facets.jsic.map((entry) => entry.value)), ["J1", "J2", "J0"]);
});

test("mood-only count corruption is caught by whole-axis expectations", () => {
  const expected = [{ value: "M0", count: 2 }, { value: "M1", count: 2 }];
  const actual = computeCatalogProjection(cells, selected(), "", "ja", labels);
  assert.deepEqual(plain(actual.facets.mood), expected);
  const mutant = mutate('if (failures === 0 || !matches[key]) {', 'if (key !== "mood" && (failures === 0 || !matches[key])) {');
  const changed = mutant(cells, selected(), "", "ja", labels);
  assert.notDeepEqual(plain(changed.facets.mood), expected);
  assert.deepEqual(plain(changed.facets.mood), [{ value: "M0", count: 0 }, { value: "M1", count: 0 }]);
  for (const axis of ["jsic", "color", "tag"]) assert.deepEqual(plain(changed.facets[axis]), plain(actual.facets[axis]));
  assert.deepEqual(ids(changed), ids(actual));
});

test("mood and tag selections narrow the results and the other axes", () => {
  // mood M1 belongs to beta and gamma
  const byMood = computeCatalogProjection(cells, selected({ mood: ["M1"] }), "", "ja", labels);
  assert.deepEqual(ids(byMood), ["beta", "gamma"]);
  assert.deepEqual(plain(byMood.facets.mood), [{ value: "M0", count: 2 }, { value: "M1", count: 2 }]);
  assert.deepEqual(plain(byMood.facets.jsic), [{ value: "J1", count: 2 }, { value: "J0", count: 0 }, { value: "J2", count: 0 }]);
  assert.deepEqual(plain(byMood.facets.color), [{ value: "C0", count: 1 }, { value: "C1", count: 1 }]);
  assert.equal(count(byMood, "tag", "店舗"), 2);
  assert.equal(count(byMood, "tag", "重複"), 1);
  // tag 店舗 is carried by beta and gamma (gamma has a second tag), alpha has only another tag and delta has none
  const byTag = computeCatalogProjection(cells, selected({ tag: ["店舗"] }), "", "ja", labels);
  assert.deepEqual(ids(byTag), ["beta", "gamma"]);
  assert.deepEqual(plain(byTag.facets.mood), [{ value: "M1", count: 2 }, { value: "M0", count: 0 }]);
  assert.equal(count(byTag, "tag", "店舗"), 2);
  assert.equal(count(byTag, "tag", "重複"), 2);
  const byTags = computeCatalogProjection(cells, selected({ tag: ["重複", "店舗"] }), "", "ja", labels);
  assert.deepEqual(ids(byTags), ["alpha", "beta", "gamma"]);
  // mood M0 with tag 重複: only alpha matches both, beta fails both axes, gamma and delta fail one each
  const byBoth = computeCatalogProjection(cells, selected({ mood: ["M0"], tag: ["重複"] }), "", "ja", labels);
  assert.deepEqual(ids(byBoth), ["alpha"]);
  assert.deepEqual(plain(byBoth.facets.mood), [{ value: "M0", count: 1 }, { value: "M1", count: 1 }]);
  assert.equal(count(byBoth, "tag", "重複"), 1);
  assert.equal(count(byBoth, "tag", "店舗"), 0);
});

test("a cell that fails two axes is counted on none of them", () => {
  // jsic J0 with color C1: alpha fails color, beta fails jsic, gamma and delta fail both
  const result = computeCatalogProjection(cells, selected({ jsic: ["J0"], color: ["C1"] }), "", "ja", labels);
  assert.deepEqual(ids(result), []);
  assert.deepEqual(plain(result.facets.jsic), [{ value: "J1", count: 1 }, { value: "J0", count: 0 }, { value: "J2", count: 0 }]);
  assert.deepEqual(plain(result.facets.color), [{ value: "C0", count: 1 }, { value: "C1", count: 0 }]);
  assert.deepEqual(plain(result.facets.mood), [{ value: "M0", count: 0 }, { value: "M1", count: 0 }]);
  assert.equal(count(result, "tag", "重複"), 0);
  assert.equal(count(result, "tag", "店舗"), 0);
});

// Reference for the exhaustive check below: the plain five scans (one for the results, and one per axis that leaves out
// that axis' own selection), written from the filtering rules instead of the single pass under test.
const valuesOf = (cell, axis) => (axis === "tag" ? cell.tags : [cell[axis]]);
const subsets = (values) => values.reduce((all, value) => all.concat(all.map((subset) => [...subset, value])), [[]]);
function reference(rows, picked, query) {
  const hit = (cell) => !query || [cell.title, cell.titleEn ?? "", cell.id].some((text) => text.toLowerCase().includes(query));
  const passes = (cell, axis) => picked[axis].length === 0 || valuesOf(cell, axis).filter((value) => picked[axis].includes(value)).length > 0;
  const scan = (skip) => rows.filter((cell) => hit(cell) && axes.every((axis) => axis === skip || passes(cell, axis)));
  const facets = {};
  for (const axis of axes) {
    const tally = new Map();
    for (const cell of rows) for (const value of valuesOf(cell, axis)) tally.set(value, 0);
    for (const cell of scan(axis)) for (const value of new Set(valuesOf(cell, axis))) tally.set(value, tally.get(value) + 1);
    facets[axis] = [...tally].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  }
  return { ids: scan(null).map((cell) => cell.id), facets };
}

test("every selection of the fixture values matches the five-scan reference", () => {
  // The reference models title, English title and id matching only; the queries are chosen so that no label or tag matches them.
  let compared = 0;
  for (const [rows, queries] of [[cells, ["", "水", "water", "zzz"]], [orderRows, [""]]]) {
    const pool = Object.fromEntries(axes.map((axis) => [axis, [...new Set(rows.flatMap((cell) => valuesOf(cell, axis)))]]));
    for (const jsic of subsets(pool.jsic)) for (const color of subsets(pool.color)) for (const mood of subsets(pool.mood)) for (const tag of subsets(pool.tag)) {
      const picked = { jsic, color, mood, tag };
      for (const query of queries) {
        const actual = computeCatalogProjection(rows, selected(picked), query, "ja", labels);
        const expected = reference(rows, picked, query);
        const where = JSON.stringify({ picked, query });
        assert.deepEqual(ids(actual), expected.ids, "results for " + where);
        assert.deepEqual(plain(actual.facets), expected.facets, "facets for " + where);
        compared++;
      }
    }
  }
  // (8 x 4 x 4 x 4 selections of cells) x 4 queries + (8 x 4 x 4 x 8 selections of orderRows) x 1 query
  assert.equal(compared, 3072);
});
