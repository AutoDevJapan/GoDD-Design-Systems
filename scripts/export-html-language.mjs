import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/** The English route must declare its language before client hydration. */
export async function setEnglishExportLanguage(outputDirectory) {
  const path = resolve(outputDirectory, "en/index.html");
  const html = await readFile(path, "utf8");
  const rootTags = [...html.matchAll(/<html\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi)];
  const tag = rootTags[0]?.[0];
  // Match whole attribute names, not data-lang or lang text inside quoted values.
  const attributes = tag?.slice(5, -1).matchAll(/([^\s=/>]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g);
  const languages = attributes ? [...attributes].filter((attribute) => attribute[1].toLowerCase() === "lang") : [];
  if (rootTags.length !== 1 || languages.length !== 1 || !/^"(?:ja|en)"$/.test(languages[0][2] ?? "")) {
    throw new Error("English export has no supported html language attribute");
  }
  const attribute = languages[0];
  const valueOffset = rootTags[0].index + 5 + attribute.index + attribute[0].lastIndexOf(attribute[2]);
  const updated = html.slice(0, valueOffset) + '"en"' + html.slice(valueOffset + attribute[2].length);
  if (updated !== html) await writeFile(path, updated, "utf8");
}
