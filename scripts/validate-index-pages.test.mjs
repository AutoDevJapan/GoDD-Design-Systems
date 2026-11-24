import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
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

function runValidator(t, change = () => {}) {
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
  for (const path of [validatorPath, schemaPath]) {
    copyFileSync(join(repoRoot, path), join(fixtureRoot, path));
  }

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
  change({ page, summary });

  for (const [path, object] of [
    ["index.json", { version: 1, generatedAt, entries }],
    ["index-summary.json", summary],
    ["index/pages/0.json", page],
  ]) {
    writeFileSync(join(fixtureRoot, path), JSON.stringify(object) + "\n", "utf8");
  }

  const result = spawnSync(process.execPath, [join(fixtureRoot, validatorPath)], {
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
