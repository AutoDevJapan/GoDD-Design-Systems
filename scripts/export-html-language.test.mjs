import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setEnglishExportLanguage } from "./export-html-language.mjs";

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
  } finally {
    await rm(root, { recursive: true });
  }
});
