import { test } from "node:test";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setEnglishExportLanguage } from "./build-pages.mjs";

test("English export changes only root language and leaves Japanese and links intact", async () => {
  const root = await mkdtemp(join(tmpdir(), "ds-export-language-"));
  try {
    await mkdir(join(root, "en"));
    const ja = '<html lang="ja"><body>日本語</body></html>';
    const en = '<html lang="ja"><body><a href="../">日本語</a>Filter by axes</body></html>';
    await writeFile(join(root, "index.html"), ja);
    await writeFile(join(root, "en/index.html"), en);
    await setEnglishExportLanguage(root);
    assert.equal(await readFile(join(root, "en/index.html"), "utf8"), en.replace('lang="ja"', 'lang="en"'));
    assert.equal(await readFile(join(root, "index.html"), "utf8"), ja);
    await setEnglishExportLanguage(root);
    assert.equal(await readFile(join(root, "en/index.html"), "utf8"), en.replace('lang="ja"', 'lang="en"'));
    await writeFile(join(root, "en/index.html"), "<body>broken export</body>");
    await assert.rejects(setEnglishExportLanguage(root), /language attribute/);
    for (const invalid of ['<html data-lang="ja">', '<html lang="ja" lang="en">']) {
      await writeFile(join(root, "en/index.html"), invalid);
      await assert.rejects(setEnglishExportLanguage(root), /language attribute/);
    }
    const quoted = '<html data-note="hello > world" lang="ja"><body>English</body></html>';
    await writeFile(join(root, "en/index.html"), quoted);
    await setEnglishExportLanguage(root);
    assert.equal(await readFile(join(root, "en/index.html"), "utf8"), quoted.replace('lang="ja"', 'lang="en"'));
    await writeFile(join(root, "en/index.html"), '<html lang="ja" data-note="hello > world" lang="en">');
    await assert.rejects(setEnglishExportLanguage(root), /language attribute/);
  } finally {
    await rm(root, { recursive: true });
  }
});

test("build helper import performs no build or environment mutation", () => {
  const moduleUrl = new URL("./build-pages.mjs", import.meta.url).href;
  const program = `
    import assert from "node:assert/strict";
    import childProcess from "node:child_process";
    import { syncBuiltinESMExports } from "node:module";
    childProcess.spawnSync = () => { throw new Error("unexpected build during import"); };
    syncBuiltinESMExports();
    const before = JSON.stringify(process.env);
    const module = await import(${JSON.stringify(moduleUrl)});
    assert.equal(typeof module.setEnglishExportLanguage, "function");
    assert.equal(JSON.stringify(process.env), before);
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", program], {
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
});
