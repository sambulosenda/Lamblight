/** Study mode data, produced by scripts/import-study.ts. Kept terse: it ships as JSON. */
export interface StudyVerse {
  /** English segments in order: [text] is plain, [text, i] links to original word o[i]. */
  e: ([string] | [string, number])[];
  /** Original-language words: [form, transliteration, morphology, Strong's key like "G3439"]. */
  o: [string, string, string, string][];
  /** Cross references, most-voted first: "ROM.5.8" or "ROM.5.8-9". */
  x: string[];
}

export interface StudyBook {
  code: string;
  /** chapters["3"]["16"] */
  chapters: Record<string, Record<string, StudyVerse>>;
}
