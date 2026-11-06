import { BOOKS, chapterName, type Book } from "./books";

/**
 * Reference parser: turns "jn 3 16", "John 3:16-18", "1cor13", "psalm 23",
 * "Jhon 3:16" (typo) into a structured reference. Shared with the Expo app later.
 */
export interface ParsedReference {
  book: Book;
  chapter?: number;
  verse?: number;
  verseEnd?: number;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s.]+/g, "");

const ROMAN: Record<string, string> = { iii: "3", ii: "2", i: "1" };

/** All names a book answers to, normalised. */
const NAME_INDEX: { key: string; book: Book }[] = BOOKS.flatMap((book) => {
  const keys = new Set([norm(book.name), norm(book.slug.replace(/-/g, "")), norm(book.code), ...book.aliases.map(norm)]);
  return [...keys].map((key) => ({ key, book }));
});

/** Edit distance where swapping two neighbouring letters ("jhon") counts as one edit. */
function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

export function findBook(input: string): Book | undefined {
  let key = norm(input);
  // "I Corinthians", "II Kings", "First John"
  const roman = key.match(/^(iii|ii|i)(?=[a-z]{2})/);
  if (roman && !NAME_INDEX.some((n) => n.key === key)) key = ROMAN[roman[1]] + key.slice(roman[1].length);
  key = key.replace(/^first/, "1").replace(/^second/, "2").replace(/^third/, "3");
  if (!key) return undefined;

  const exact = NAME_INDEX.find((n) => n.key === key);
  if (exact) return exact.book;

  // Unambiguous prefix of a full name: "gene" → Genesis, "philip" → Philippians.
  const prefix = BOOKS.filter((b) => norm(b.name).startsWith(key));
  if (key.length >= 3 && prefix.length === 1) return prefix[0];

  // Typos: closest full name within a small edit distance.
  if (key.length >= 4) {
    let best: { book: Book; d: number } | undefined;
    for (const b of BOOKS) {
      const name = norm(b.name);
      const score = editDistance(key, name);
      if (!best || score < best.d) best = { book: b, d: score };
    }
    const limit = key.length >= 7 ? 2 : 1;
    if (best && best.d <= limit) return best.book;
  }
  return undefined;
}

/**
 * Parse a reference. Returns null when the input does not look like one, so
 * the caller can fall back to keyword search.
 */
export function parseReference(input: string): ParsedReference | null {
  const text = input.trim().replace(/[–—]/g, "-");
  // Book part: optional leading number, then letters (with spaces/dots between words).
  const m = text.match(
    /^((?:[1-3]|i{1,3})?\s*[a-z][a-z.\s]*?)\s*(\d+)?(?:\s*[:.\s]\s*(\d+))?(?:\s*-\s*(\d+))?\s*$/i,
  );
  if (!m) return null;
  const book = findBook(m[1]);
  if (!book) return null;

  const chapter = m[2] ? Number(m[2]) : undefined;
  let verse = m[3] ? Number(m[3]) : undefined;
  let verseEnd = m[4] ? Number(m[4]) : undefined;

  // Single-chapter books: "Jude 3" means verse 3.
  if (book.chapters === 1 && chapter !== undefined && verse === undefined && chapter > 1) {
    verse = chapter;
    return { book, chapter: 1, verse, verseEnd };
  }
  if (chapter !== undefined && (chapter < 1 || chapter > book.chapters)) return null;
  if (verse !== undefined && verse < 1) verse = undefined;
  if (verseEnd !== undefined && verse !== undefined && verseEnd <= verse) verseEnd = undefined;
  return { book, chapter, verse, verseEnd };
}

/** "John 3:16", "John 3", "Jude 1:3" */
export function formatReference(book: Book, chapter: number, verse?: number, verseEnd?: number): string {
  if (verse === undefined) return `${chapterName(book)} ${chapter}`;
  return `${chapterName(book)} ${chapter}:${verse}${verseEnd ? `–${verseEnd}` : ""}`;
}
