import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/** The English route must declare its language before client hydration. */
export async function setEnglishExportLanguage(outputDirectory) {
  const path = resolve(outputDirectory, "en/index.html");
  const html = await readFile(path, "utf8");
  if (!/<html\b[^>]*\blang="(?:ja|en)"/.test(html)) {
    throw new Error("English export has no supported html language attribute");
  }
  const updated = html.replace(/(<html\b[^>]*\blang=")(?:ja|en)(")/, "$1en$2");
  if (updated !== html) await writeFile(path, updated, "utf8");
}
