/**
 * Count how many verses use each Strong's number, for "Used in 9 verses of the
 * New Testament" in Study mode. Reads data/study/<BOOK>.json, writes
 * data/study/uses.json. Run after import-study: npm run count-uses
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StudyBook } from "../src/lib/study-types";

const DIR = path.join(process.cwd(), "data", "study");

async function main() {
  const counts: Record<string, number> = {};
  const files = (await readdir(DIR)).filter((f) => /^[1-3A-Z]{3}\.json$/.test(f));
  for (const file of files) {
    const book = JSON.parse(await readFile(path.join(DIR, file), "utf8")) as StudyBook;
    for (const chapter of Object.values(book.chapters)) {
      for (const verse of Object.values(chapter)) {
        for (const key of new Set(verse.o.map((w) => w[3]))) counts[key] = (counts[key] ?? 0) + 1;
      }
    }
  }
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
  await writeFile(path.join(DIR, "uses.json"), JSON.stringify(sorted));
  console.log(`Counted ${Object.keys(sorted).length} Strong's numbers across ${files.length} books.`);
}

main();
