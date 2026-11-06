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

/**
 * Well-known verses people often half-remember. A match here ranks above an
 * equally good match elsewhere. Replace with real popularity data once we have it.
 */
const POPULAR = new Set([
  "JHN.3.16", "PHP.4.6", "PHP.4.7", "PHP.4.13", "1PE.5.7", "PSA.23.1", "PSA.23.4", "JER.29.11", "ROM.8.28", "ISA.41.10",
  "PRO.3.5", "PRO.3.6", "MAT.11.28", "MAT.6.33", "MAT.6.34", "JOS.1.9", "ISA.40.31", "PSA.46.1", "PSA.46.10", "ROM.12.2",
  "2CO.5.17", "GAL.2.20", "EPH.2.8", "HEB.11.1", "1CO.13.4", "1CO.13.13", "JHN.14.6", "JHN.14.27", "ROM.5.8", "ROM.6.23",
  "PSA.119.105", "LAM.3.22", "LAM.3.23", "2TI.1.7", "JAS.1.5", "MIC.6.8", "PSA.121.1", "PSA.121.2", "PSA.34.18", "PSA.55.22",
  "MAT.28.19", "JHN.1.1", "GEN.1.1", "ROM.10.9", "1JN.1.9", "PSA.37.4", "ISA.26.3", "COL.3.23", "HEB.13.5", "DEU.31.6",
]);

/** Score one verse: whole-word matches beat stems ("anxious" over "anxiousness"), phrases beat scattered words. */
function score(row: Row, q: string, words: string[]): number {
  let total = 0;
  if (row.norm.includes(q)) total += 100;
  for (const w of words) {
    if (row.norm.includes(` ${w} `)) total += 10;
    else if (row.norm.includes(` ${w}`)) total += 4;
    else return 0; // every word must appear, at least as a prefix
  }
  if (POPULAR.has(`${row.book.code}.${row.chapter}.${row.verse}`)) total += 15;
  // Shorter verses read better as results; at most a 3-point nudge.
  total += Math.max(0, 3 - row.text.length / 100);
  return total;
}

export async function searchVerses(version: string, query: string, limit = 50): Promise<{ total: number; hits: SearchHit[] }> {
  const q = normalise(query);
  const words = q.trim().split(" ").filter(Boolean);
  if (!words.length) return { total: 0, hits: [] };
  if (!indexes.has(version)) indexes.set(version, buildIndex(version));
  const rows = await indexes.get(version)!;

  const scored: { row: Row; s: number; i: number }[] = [];
  rows.forEach((row, i) => {
    const s = score(row, q, words);
    if (s > 0) scored.push({ row, s, i });
  });
  // Highest score first; ties keep Bible order.
  scored.sort((a, b) => b.s - a.s || a.i - b.i);
  return {
    total: scored.length,
    hits: scored.slice(0, limit).map(({ row: { book, chapter, verse, text } }) => ({ book, chapter, verse, text })),
  };
}
