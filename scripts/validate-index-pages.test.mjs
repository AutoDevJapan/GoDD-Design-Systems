import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = realpathSync(fileURLToPath(new URL("../", import.meta.url)));
const schemaPath = "documents/schema/index-page.schema.json";
const validatorPath = "scripts/validate-index-pages.mjs";
const builderPath = "scripts/build-index-summary.mjs";
const numberCodecPath = "scripts/index-page-json-numbers.mjs";
const generatedAt = "2026-01-01T00:00:00Z";

function cell(color, title, hashChar) {
  return {
    id: "1234_" + color + "_calm",
    path: "design-md/1234/" + color + "/calm/DESIGN.md",
    jsic: "1234",
    color,
    mood: "calm",
    variant: 0,
    tags: ["serif", "grid"],
    title,
    titleEn: "Fixture cell",
    hash: "sha256:" + hashChar.repeat(64),
    createdAt: generatedAt,
  };
}

function createFixture(t) {
  // Keep the fixture under the checkout so the copied CLI resolves the normal
  // installed dependencies. The CLI resolves its catalog relative to its script.
  const fixtureRoot = mkdtempSync(join(repoRoot, ".index-pages-test-"));
  t.after(() => {
    assert.equal(realpathSync(fixtureRoot), fixtureRoot);
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  for (const dir of ["scripts", "documents/schema", "index/pages"]) {
    mkdirSync(join(fixtureRoot, dir), { recursive: true });
  }
  for (const path of [validatorPath, schemaPath, numberCodecPath]) {
    copyFileSync(join(repoRoot, path), join(fixtureRoot, path));
  }
  return fixtureRoot;
}

function runFixtureScript(fixtureRoot, script, ...args) {
  const result = spawnSync(process.execPath, [join(fixtureRoot, script), ...args], {
    cwd: fixtureRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10_000,
    maxBuffer: 64 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}

function writeJson(fixtureRoot, path, value) {
  writeFileSync(join(fixtureRoot, path), JSON.stringify(value) + "\n", "utf8");
}

function runValidator(t, change = () => {}, { checkNumberOnly = false } = {}) {
  const fixtureRoot = createFixture(t);
  const entries = [cell("blue", "Blue cell", "a"), cell("red", "Red cell", "b")];
  const summary = { pageCount: 1, entryCount: entries.length };
  const page = {
    version: 1,
    page: 0,
    pageSize: 1000,
    entryCount: entries.length,
    generatedAt,
    entries: structuredClone(entries),
  };
  change({ entries, page, summary });

  for (const [path, object] of [
    ["index.json", { version: 1, generatedAt, entries }],
    ["index-summary.json", summary],
    ["index/pages/0.json", page],
  ]) {
    writeJson(fixtureRoot, path, object);
  }

  const result = runFixtureScript(fixtureRoot, validatorPath);
  if (checkNumberOnly) expectSuccess(runWithoutExactNumbers(fixtureRoot));
  return result;
}

function runWithoutExactNumbers(fixtureRoot) {
  // Restore only the previous Number-based JSON read, in an owned fixture.
  const source = readFileSync(join(fixtureRoot, validatorPath), "utf8");
  const parts = source.split('JSON.parse(readFileSync(path, "utf8"), reviver)');
  assert.equal(parts.length, 2, "expected exactly one JSON reader to replace");
  const counterPath = "scripts/validate-index-pages-without-exact-numbers.mjs";
  writeFileSync(
    join(fixtureRoot, counterPath),
    parts.join('JSON.parse(readFileSync(path, "utf8"))'),
    { encoding: "utf8", flag: "wx" },
  );
  return runFixtureScript(fixtureRoot, counterPath);
}

function expectSuccess({ status, stdout, stderr }) {
  assert.equal(status, 0, stderr);
  assert.equal(stderr, "");
  assert.match(stdout, /OK: pages=1, combinedEntryCount=2, pageSize=1000/);
}

test("accepts an exact slice of the index", (t) => {
  expectSuccess(runValidator(t));
});

test("accepts the same entry with its object keys in a different order", (t) => {
  expectSuccess(runValidator(t, ({ page }) => {
    const entry = page.entries[0];
    const reordered = Object.fromEntries(Object.entries(entry).reverse());
    assert.notEqual(Object.keys(reordered)[0], Object.keys(entry)[0]);
    page.entries[0] = reordered;
  }));
});

const entryMismatch = /page 0: entries\[0\] が index\.json の entry と不一致/;
const refusals = [
  [
    "a page number different from the filename",
    ({ page }) => {
      page.page = 1;
    },
    /page 0: doc\.page=1/,
  ],
  [
    "a missing numbered page",
    ({ summary }) => {
      summary.pageCount = 2;
    },
    /欠落: index\/pages\/1\.json/,
  ],
  [
    "an incorrect declared entry count",
    ({ page }) => {
      page.entryCount = 1;
    },
    /page 0: entryCount \(1\)/,
  ],
  [
    "a shortened entry list",
    ({ page }) => {
      page.entries.pop();
    },
    /page 0: entries\.length/,
  ],
  [
    "an ID different from the index",
    ({ page }) => {
      page.entries[0].id = "1234_green_calm";
    },
    /page 0: entries\[0\]\.id/,
  ],
  [
    "entries in a different order",
    ({ page }) => {
      page.entries.reverse();
    },
    /page 0: entries\[0\]\.id/,
  ],
  [
    "a same-ID title change",
    ({ page }) => {
      page.entries[0].title = "Other title";
    },
    entryMismatch,
  ],
  [
    "a same-ID hash change",
    ({ page }) => {
      page.entries[0].hash = "sha256:" + "c".repeat(64);
    },
    entryMismatch,
  ],
  [
    "a same-ID path change",
    ({ page }) => {
      page.entries[0].path = "design-md/1234/blue/calm/v1/DESIGN.md";
    },
    entryMismatch,
  ],
  [
    "different ordering within the tags array",
    ({ page }) => {
      page.entries[0].tags.reverse();
    },
    entryMismatch,
  ],
  [
    "a value changed from a number to a string",
    ({ page }) => {
      page.entries[0].variant = "0";
    },
    entryMismatch,
  ],
  [
    "a missing optional field",
    ({ page }) => {
      delete page.entries[0].titleEn;
    },
    entryMismatch,
  ],
  [
    "an added optional field absent from the index",
    ({ page }) => {
      page.entries[0].license = "MIT";
    },
    entryMismatch,
  ],
];

for (const [description, change, diagnostic] of refusals) {
  test("rejects " + description, (t) => {
    const { status, stdout, stderr } = runValidator(t, change);
    assert.equal(status, 1, "stdout:\n" + stdout + "\nstderr:\n" + stderr);
    assert.equal(stdout, "");
    assert.match(stderr, diagnostic);
  });
}

function withVariant(entry, token, suffix) {
  const variant = JSON.rawJSON(token);
  if (suffix === undefined) return { ...entry, variant };
  return {
    ...entry,
    id: entry.id + "_v" + suffix,
    path: entry.path.replace("DESIGN.md", "v" + suffix + "/DESIGN.md"),
    variant,
  };
}

function setVariantPair(fixture, position, indexToken, pageToken, suffix) {
  const entry = withVariant(fixture.entries[position], indexToken, suffix);
  fixture.entries[position] = entry;
  fixture.page.entries[position] = { ...entry, variant: JSON.rawJSON(pageToken) };
}

function variantTokens(fixtureRoot, path) {
  const original = readFileSync(join(fixtureRoot, path), "utf8");
  return JSON.parse(original, (key, value, context) =>
    key === "variant" ? context.source : value,
  ).entries.map((entry) => entry.variant);
}

function expectRefusal({ status, stdout, stderr }, diagnostic) {
  assert.equal(status, 1, "stdout:\n" + stdout + "\nstderr:\n" + stderr);
  assert.equal(stdout, "");
  assert.match(stderr, diagnostic);
}

test("accepts the builder's serialized page and preserves its large variant", (t) => {
  const fixtureRoot = createFixture(t);
  copyFileSync(join(repoRoot, builderPath), join(fixtureRoot, builderPath));
  const large = "9007199254740993";
  const entries = [
    withVariant(cell("blue", "Blue cell", "a"), "-0"),
    withVariant(cell("red", "Red cell", "b"), large, large),
  ];
  writeJson(fixtureRoot, "index.json", { version: 1, generatedAt, entries });
  assert.deepEqual(variantTokens(fixtureRoot, "index.json"), ["-0", large]);

  const build = runFixtureScript(fixtureRoot, builderPath, "--pages");
  assert.equal(build.status, 0, build.stderr);
  assert.equal(build.stderr, "");
  assert.deepEqual(variantTokens(fixtureRoot, "index/pages/0.json"), ["0", large]);

  expectSuccess(runFixtureScript(fixtureRoot, validatorPath));
  expectRefusal(runWithoutExactNumbers(fixtureRoot), entryMismatch);
});

test("accepts equal integer, decimal and exponent spellings", (t) => {
  expectSuccess(runValidator(t, (fixture) => {
    setVariantPair(fixture, 0, "1", "1.0", "1");
    setVariantPair(fixture, 1, "1.0", "10E-1", "1");
  }));
});

test("accepts equivalent large numbers written with different exponents", (t) => {
  expectSuccess(runValidator(t, (fixture) => {
    const large = "9007199254740993";
    setVariantPair(fixture, 0, large, large + "0e-1", large);
  }));
});

for (const [description, indexToken, pageToken] of [
  ["a fractional value hidden by Number rounding", "1", "1.0000000000000001"],
  ["a neighboring large integer hidden by Number rounding", "9007199254740992", "9007199254740993"],
]) {
  test("rejects " + description, (t) => {
    // These are distinct source tokens but the old comparator sees one Number.
    assert.notEqual(indexToken, pageToken);
    assert.equal(Number(indexToken), Number(pageToken));
    const result = runValidator(t, (fixture) => {
      setVariantPair(fixture, 0, indexToken, pageToken, indexToken);
    }, { checkNumberOnly: true });
    expectRefusal(result, entryMismatch);
  });
}

test("compares very large exponents without rounding or expansion", (t) => {
  const exponent = "9".repeat(80);
  const minusOne = "9".repeat(79) + "8";
  const makeEquivalent = (fixture) => {
    setVariantPair(fixture, 0, "1e" + exponent, "10e" + minusOne);
  };
  expectSuccess(runValidator(t, makeEquivalent));
  expectRefusal(runValidator(t, (fixture) => {
    setVariantPair(fixture, 0, "1e" + exponent, "1e" + minusOne);
  }, { checkNumberOnly: true }), entryMismatch);
});

for (const [titleIndex, idIndex] of [[0, 1], [1, 0]]) {
  test("reports ID mismatch at " + idIndex + " with a title mismatch at " + titleIndex, (t) => {
    const result = runValidator(t, ({ page }) => {
      page.entries[titleIndex].title = "Other title";
      page.entries[idIndex].id = "1234_green_calm";
    });
    expectRefusal(result, new RegExp("page 0: entries\\[" + idIndex + "\\]\\.id"));
    assert.doesNotMatch(result.stderr, /が index\.json の entry と不一致/);
  });
}

test("accepts equivalent exponent spellings for page integers", (t) => {
  expectSuccess(runValidator(t, ({ page }) => {
    page.version = JSON.rawJSON("10e-1");
    page.page = JSON.rawJSON("-0e0");
    page.pageSize = JSON.rawJSON("1e3");
    page.entryCount = JSON.rawJSON("20e-1");
  }));
});

for (const [field, token, diagnostic] of [
  [
    "version",
    "1.0000000000000001",
    /page 0 schema: \/version must be equal to constant/,
  ],
  [
    "page",
    "1e-500",
    /page 0: doc\.page=1e-500 がファイル番号と不一致/,
  ],
  [
    "pageSize",
    "1000.00000000000001",
    /page 0: pageSize は 1000 である必要があります/,
  ],
  [
    "entryCount",
    "2.0000000000000001",
    /page 0: entryCount \(20000000000000001e-16\) が期待スライス長 \(2\) と不一致/,
  ],
]) {
  test("rejects a page " + field + " mismatch hidden by Number rounding", (t) => {
    const result = runValidator(t, ({ page }) => {
      assert.equal(Number(token), page[field]);
      page[field] = JSON.rawJSON(token);
    }, { checkNumberOnly: true });
    expectRefusal(result, diagnostic);
  });
}
