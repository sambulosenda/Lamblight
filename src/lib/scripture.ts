/**
 * Shared Scripture data types. These are the shape of the JSON files the importer
 * writes to data/<version>/<BOOK>.json, and what the reader renders.
 */

/** Inline content inside a block. Strings are plain text. */
export type Inline =
  | string
  /** Start of a verse. */
  | { v: number }
  /** Divine name (USFM \nd), shown in small caps: "Lord" renders as LORD. */
  | { nd: string }
  /** Footnote call; the number indexes Chapter.notes. */
  | { f: number };

/**
 * Block-level element. `t` is the USFM paragraph marker without the backslash:
 * p, m, pmo, pi1, pc, li1, li2 (prose); q1, q2, qr (poetry lines); b (blank line);
 * s1, s2 (section headings); r (parallel references); d (psalm title);
 * ms, mr (Psalms book divisions); qa (acrostic letter).
 */
export interface Block {
  t: string;
  c: Inline[];
}

export interface Footnote {
  /** Verse the note belongs to (0 for psalm titles). */
  v: number;
  /** Reference as printed in the source, e.g. "3:16". */
  ref: string;
  text: string;
}

export interface Chapter {
  n: number;
  blocks: Block[];
  /** Plain text of each verse, in order. Verses missing from the text (e.g. Matthew 17:21) are absent. */
  verses: [number, string][];
  notes: Footnote[];
}

export interface BookData {
  code: string;
  chapters: Chapter[];
}

export interface VersionMeta {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
  copyright: string;
  source: string;
  importedAt: string;
}

/** Heading-type blocks hold no verse text. */
export const HEADING_BLOCKS = new Set(["s1", "s2", "s3", "r", "d", "ms", "mr", "qa", "mt1", "mt2"]);

/** Poetry blocks render as separate indented lines and must never reflow as prose. */
export const POETRY_BLOCKS = new Set(["q1", "q2", "q3", "qr", "qc", "qm1", "qm2"]);

/** Canonical verse ID shared across versions, e.g. JHN.3.16. */
export function verseId(book: string, chapter: number, verse: number): string {
  return `${book}.${chapter}.${verse}`;
}
