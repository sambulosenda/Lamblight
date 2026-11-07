import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife } from "next/cache";
import { getChapter } from "./bible";
import { bookByCode, chapterName } from "./books";
import type { StudyBook, StudyVerse } from "./study-types";

/**
 * Study mode data (word links to Greek/Hebrew, Strong's definitions and cross
 * references). It is aligned to the BSB, so Study is BSB-only.
 */
const DIR = path.join(process.cwd(), "data", "study");

async function readBook(code: string): Promise<StudyBook | null> {
  try {
    return JSON.parse(await readFile(path.join(DIR, `${code}.json`), "utf8")) as StudyBook;
  } catch {
    return null;
  }
}

async function readLexicon(): Promise<Record<string, string>> {
  "use cache";
  cacheLife("max");
  try {
    return JSON.parse(await readFile(path.join(DIR, "lexicon.json"), "utf8"));
  } catch {
    return {};
  }
}

/** Strong's number → how many verses use it, from scripts/count-uses.ts. */
async function readUses(): Promise<Record<string, number>> {
  "use cache";
  cacheLife("max");
  try {
    return JSON.parse(await readFile(path.join(DIR, "uses.json"), "utf8"));
  } catch {
    return {};
  }
}

export interface StudyCrossRef {
  id: string;
  ref: string;
  href: string;
  text: string;
}

export interface StudyData {
  verse: StudyVerse;
  /** Strong's definitions for the words in this verse. */
  lexicon: Record<string, string>;
  /** How many verses in the Bible use each Strong's number in this verse. */
  uses: Record<string, number>;
  crossRefs: StudyCrossRef[];
}

async function crossRef(id: string, version: string): Promise<StudyCrossRef | null> {
  const m = id.match(/^([1-3A-Z]{3})\.(\d+)\.(\d+)(?:-(\d+))?$/);
  const book = m ? bookByCode(m[1]) : undefined;
  if (!m || !book) return null;
  const c = Number(m[2]);
  const start = Number(m[3]);
  const end = m[4] ? Number(m[4]) : start;
  const ch = await getChapter(version, book.code, c);
  const text = (ch?.verses ?? [])
    .filter(([n]) => n >= start && n <= end)
    .map(([, t]) => t)
    .join(" ");
  if (!text) return null;
  return {
    id,
    ref: `${chapterName(book)} ${c}:${start}${end > start ? `–${end}` : ""}`,
    href: `/${version}/${book.slug}/${c}/${start}`,
    text,
  };
}

export async function getStudy(version: string, code: string, chapter: number, verse: number): Promise<StudyData | null> {
  "use cache";
  cacheLife("max");
  const [book, lexAll, usesAll] = await Promise.all([readBook(code), readLexicon(), readUses()]);
  const v = book?.chapters[String(chapter)]?.[String(verse)];
  if (!v) return null;
  const lexicon: Record<string, string> = {};
  const uses: Record<string, number> = {};
  for (const [, , , key] of v.o) {
    if (lexAll[key]) lexicon[key] = lexAll[key];
    if (usesAll[key]) uses[key] = usesAll[key];
  }
  const crossRefs = (await Promise.all(v.x.map((id) => crossRef(id, version)))).filter((x) => x !== null);
  return { verse: v, lexicon, uses, crossRefs };
}
