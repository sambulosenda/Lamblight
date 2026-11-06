import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { BOOKS, type Book } from "./books";
import type { BookData } from "./scripture";

/**
 * Simple in-memory keyword search over one self-hosted version. Fine for the MVP
 * (31k verses, a few ms per query); Meilisearch or Typesense replaces it later.
 */
export interface SearchHit {
  book: Book;
  chapter: number;
  verse: number;
  text: string;
}

interface Row extends SearchHit {
  norm: string;
}

const indexes = new Map<string, Promise<Row[]>>();

export const normalise = (s: string) =>
  ` ${s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ʼ’‘']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;

async function buildIndex(version: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (const book of BOOKS) {
    const raw = await readFile(path.join(process.cwd(), "data", version, `${book.code}.json`), "utf8");
    const data = JSON.parse(raw) as BookData;
    for (const ch of data.chapters) {
      for (const [verse, text] of ch.verses) rows.push({ book, chapter: ch.n, verse, text, norm: normalise(text) });
    }
  }
  return rows;
}

export async function searchVerses(version: string, query: string, limit = 50): Promise<{ total: number; hits: SearchHit[] }> {
  const q = normalise(query);
  const words = q.trim().split(" ").filter(Boolean);
  if (!words.length) return { total: 0, hits: [] };
  if (!indexes.has(version)) indexes.set(version, buildIndex(version));
  const rows = await indexes.get(version)!;

  const phrase: Row[] = [];
  const allWords: Row[] = [];
  for (const row of rows) {
    if (row.norm.includes(q)) phrase.push(row);
    else if (words.every((w) => row.norm.includes(` ${w}`))) allWords.push(row);
  }
  const ranked = [...phrase, ...allWords];
  return {
    total: ranked.length,
    hits: ranked.slice(0, limit).map(({ book, chapter, verse, text }) => ({ book, chapter, verse, text })),
  };
}
