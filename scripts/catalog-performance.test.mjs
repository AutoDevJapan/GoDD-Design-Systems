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
const axes = ["jsic", "color", "mood", "tag"];
const selected = (values = {}) => Object.fromEntries(axes.map((key) => [key, new Set(values[key] ?? [])]));
const labels = { jsic: { J0: "農業", J1: "飲食", J2: "店舗" }, color: { C0: "青", C1: "赤" }, mood: { M0: "静寂", M1: "明朗" } };
const cells = [
  { id: "alpha", title: "水と光", titleEn: "Water Light", jsic: "J0", color: "C0", mood: "M0", tags: ["重複", "重複"] },
  { id: "beta", title: "赤い店", titleEn: "Red Shop", jsic: "J1", color: "C1", mood: "M1", tags: ["店舗"] },
  { id: "gamma", title: "水 店", jsic: "J1", color: "C0", mood: "M1", tags: ["店舗", "重複"] },
  { id: "delta", title: "Space Title", titleEn: "", jsic: "J2", color: "C0", mood: "M0", tags: [] },
];
const plain = (value) => JSON.parse(JSON.stringify(value));
const ids = (result) => plain(result.filtered.map((cell) => cell.id));
const count = (result, axis, value) => result.facets[axis].find((entry) => entry.value === value)?.count;

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
  assert.equal(JSON.stringify(axes.map((axis) => [...selection[axis]])), before);
});

test("search, locale fallback, absent selections and empty input stay correct", () => {
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
  const from = "if (failures > 1 || !queryMatches";
  const to = "if (failures > 0 || !queryMatches";
  assert.equal(componentSource.split(from).length, 2);
  const mutant = loadText(componentSource.replace(from, to), resolveComponent).computeCatalogProjection;
  const selection = selected({ jsic: ["J0"] });
  assert.equal(count(computeCatalogProjection(cells, selection, "", "ja", labels), "jsic", "J1"), 2);
  assert.equal(count(mutant(cells, selection, "", "ja", labels), "jsic", "J1"), 0);
});

test("facet arrays retain count order and stable value tie-breaks", () => {
  const orderRows = [
    { id: "a", title: "a", jsic: "J1", color: "C0", mood: "M0", tags: ["tagB", "tagA", "tagB"] },
    { id: "b", title: "b", jsic: "J1", color: "C0", mood: "M1", tags: ["tagA"] },
    { id: "c", title: "c", jsic: "J0", color: "C0", mood: "M0", tags: ["tagB"] },
    { id: "d", title: "d", jsic: "J2", color: "C1", mood: "M1", tags: ["tagC"] },
  ];
  const expected = {
    jsic: [{ value: "J1", count: 2 }, { value: "J0", count: 1 }, { value: "J2", count: 1 }],
    color: [{ value: "C0", count: 3 }, { value: "C1", count: 1 }],
    mood: [{ value: "M0", count: 2 }, { value: "M1", count: 2 }],
    tag: [{ value: "tagA", count: 2 }, { value: "tagB", count: 2 }, { value: "tagC", count: 1 }],
  };
  const actual = computeCatalogProjection(orderRows, selected(), "", "ja", labels);
  assert.deepEqual(plain(actual.facets), expected);
  const from = "a.value.localeCompare(b.value)";
  const to = "b.value.localeCompare(a.value)";
  assert.equal(componentSource.split(from).length, 2);
  const mutant = loadText(componentSource.replace(from, to), resolveComponent).computeCatalogProjection;
  const changed = mutant(orderRows, selected(), "", "ja", labels);
  assert.notDeepEqual(plain(changed.facets), expected);
  assert.deepEqual(plain(changed.facets.jsic.map((entry) => entry.value)), ["J1", "J2", "J0"]);
});

test("mood-only count corruption is caught by whole-axis expectations", () => {
  const expected = [{ value: "M0", count: 2 }, { value: "M1", count: 2 }];
  const actual = computeCatalogProjection(cells, selected(), "", "ja", labels);
  assert.deepEqual(plain(actual.facets.mood), expected);
  const from = 'if (failures === 0 || !matches[key]) {';
  const to = 'if (key !== "mood" && (failures === 0 || !matches[key])) {';
  assert.equal(componentSource.split(from).length, 2);
  const mutant = loadText(componentSource.replace(from, to), resolveComponent).computeCatalogProjection;
  const changed = mutant(cells, selected(), "", "ja", labels);
  assert.notDeepEqual(plain(changed.facets.mood), expected);
  assert.ok(changed.facets.mood.every((entry) => entry.count === 0));
  for (const axis of ["jsic", "color", "tag"]) assert.deepEqual(plain(changed.facets[axis]), plain(actual.facets[axis]));
  assert.deepEqual(ids(changed), ids(actual));
});
