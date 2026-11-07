import { BOOKS, bookByCode, chapterName, type Book } from "./books";

/**
 * Reading plans. Each one is built from the book list alone (no Bible text), so the
 * same schedule can be computed on the server for the plan pages and in the browser
 * for the reader's progress, without shipping any plan data.
 *
 * A chapter is keyed "JHN.3". A plan is a list of days; each day is a list of chapters.
 */
export interface Plan {
  slug: string;
  name: string;
  /** One line under the title. */
  intro: string;
  days: string[][];
}

const key = (book: Book, chapter: number) => `${book.code}.${chapter}`;

function chaptersOf(codes: string[]): string[] {
  return codes.flatMap((code) => {
    const book = bookByCode(code)!;
    return Array.from({ length: book.chapters }, (_, i) => key(book, i + 1));
  });
}

/** Split chapters into `days` days as evenly as possible, keeping their order. */
export function splitIntoDays(chapters: string[], days: number): string[][] {
  return Array.from({ length: days }, (_, d) => chapters.slice(Math.round((d * chapters.length) / days), Math.round(((d + 1) * chapters.length) / days)));
}

const ALL = BOOKS.map((b) => b.code);
const NT = BOOKS.filter((b) => b.testament === "NT").map((b) => b.code);

export const PLANS: Plan[] = [
  {
    slug: "bible-in-a-year",
    name: "The Bible in a year",
    intro: "Every chapter from Genesis to Revelation, about three or four a day.",
    days: splitIntoDays(chaptersOf(ALL), 365),
  },
  {
    slug: "new-testament-in-90-days",
    name: "The New Testament in 90 days",
    intro: "Matthew to Revelation in three months, about three chapters a day.",
    days: splitIntoDays(chaptersOf(NT), 90),
  },
  {
    slug: "psalms-and-proverbs",
    name: "Psalms and Proverbs in a month",
    intro: "Five psalms and one chapter of Proverbs a day, for 31 days.",
    // The classic pattern: on day n, Psalms n, n+30, n+60, n+90, n+120 and Proverbs n.
    // That covers all 150 psalms in 30 days, so day 31 is Proverbs 31 alone.
    days: Array.from({ length: 31 }, (_, i) => {
      const n = i + 1;
      const psalms = n <= 30 ? [n, n + 30, n + 60, n + 90, n + 120] : [];
      return [...psalms.map((p) => `PSA.${p}`), `PRO.${n}`];
    }),
  },
  {
    slug: "gospels-in-30-days",
    name: "The Gospels in 30 days",
    intro: "Matthew, Mark, Luke and John: the life of Jesus in a month.",
    days: splitIntoDays(chaptersOf(["MAT", "MRK", "LUK", "JHN"]), 30),
  },
];

const BY_SLUG = new Map(PLANS.map((p) => [p.slug, p]));

export function planBySlug(slug: string): Plan | undefined {
  return BY_SLUG.get(slug);
}

export function planChapterCount(plan: Plan): number {
  return plan.days.reduce((n, d) => n + d.length, 0);
}

/** "JHN.3" → { book, chapter }, or null. */
export function parseChapterKey(k: string): { book: Book; chapter: number } | null {
  const m = k.match(/^([1-3A-Z]{3})\.(\d+)$/);
  const book = m ? bookByCode(m[1]) : undefined;
  return m && book ? { book, chapter: Number(m[2]) } : null;
}

/**
 * A day's reading as short labels: ["Genesis 1–3"], ["Psalms 1, 31, 61, 91, 121", "Proverbs 1"],
 * or ["Genesis 50", "Exodus 1–2"] across a book boundary.
 */
export function dayLabel(day: string[]): string[] {
  const groups: { book: Book; chapters: number[] }[] = [];
  for (const k of day) {
    const p = parseChapterKey(k);
    if (!p) continue;
    const last = groups[groups.length - 1];
    if (last && last.book === p.book) last.chapters.push(p.chapter);
    else groups.push({ book: p.book, chapters: [p.chapter] });
  }
  return groups.map(({ book, chapters }) => {
    const consecutive = chapters.every((c, i) => i === 0 || c === chapters[i - 1] + 1);
    const name = chapters.length > 1 && book.code === "PSA" ? "Psalms" : chapterName(book);
    if (chapters.length === 1) return `${name} ${chapters[0]}`;
    return consecutive ? `${name} ${chapters[0]}–${chapters[chapters.length - 1]}` : `${name} ${chapters.join(", ")}`;
  });
}

/** "Genesis 3" */
export function chapterLabel(k: string): string {
  const p = parseChapterKey(k);
  return p ? `${chapterName(p.book)} ${p.chapter}` : k;
}
