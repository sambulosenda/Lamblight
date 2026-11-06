import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife } from "next/cache";
import { BOOKS, bookByCode, bookIndex, type Book } from "./books";
import type { BookData, Chapter, VersionMeta } from "./scripture";
import { VERSIONS, type VersionInfo } from "./versions";

/**
 * Server-side access to the imported Bible JSON in data/<version>/.
 * Everything here is static between imports, so results are cached for as long
 * as the deployment lives. Swapping this module for Postgres later should not
 * change any page code.
 */

const DATA_DIR = path.join(process.cwd(), "data");

async function readBook(version: string, code: string): Promise<BookData | null> {
  try {
    const raw = await readFile(path.join(DATA_DIR, version, `${code}.json`), "utf8");
    return JSON.parse(raw) as BookData;
  } catch {
    return null;
  }
}

export async function getVersionMeta(version: string): Promise<VersionMeta | null> {
  "use cache";
  cacheLife("max");
  try {
    const raw = await readFile(path.join(DATA_DIR, version, "meta.json"), "utf8");
    return JSON.parse(raw) as VersionMeta;
  } catch {
    return null;
  }
}

export async function getChapter(version: string, code: string, chapter: number): Promise<Chapter | null> {
  "use cache";
  cacheLife("max");
  const book = await readBook(version, code);
  return book?.chapters[chapter - 1] ?? null;
}

/** Verse numbers present in every chapter of a book, for the chapter picker and verse sitemaps. */
export async function getVerseNumbers(version: string, code: string): Promise<number[][]> {
  "use cache";
  cacheLife("max");
  const book = await readBook(version, code);
  return book?.chapters.map((ch) => ch.verses.map(([n]) => n)) ?? [];
}

export interface ChapterRef {
  book: Book;
  chapter: number;
}

export function previousChapter(book: Book, chapter: number): ChapterRef | null {
  if (chapter > 1) return { book, chapter: chapter - 1 };
  const prev = BOOKS[bookIndex(book.code) - 1];
  return prev ? { book: prev, chapter: prev.chapters } : null;
}

export function nextChapter(book: Book, chapter: number): ChapterRef | null {
  if (chapter < book.chapters) return { book, chapter: chapter + 1 };
  const next = BOOKS[bookIndex(book.code) + 1];
  return next ? { book: next, chapter: 1 } : null;
}

export function selfHostedVersion(id: string): VersionInfo | undefined {
  return VERSIONS.find((v) => v.id === id && v.source === "self-hosted");
}

export { bookByCode };
