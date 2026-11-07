/**
 * Build data/topics.json from OpenBible.info's topical data (CC BY) and the allowlist
 * in scripts/topic-list.ts:
 *
 *   npm run import:topics -- --src ./topic-scores.txt
 *
 * topic-scores.txt comes from https://a.openbible.info/data/topic-scores.zip
 * (columns: topic, OSIS passage, score = percentage of the topic's votes).
 *
 * For each listed topic: merge the passages of all its keys, keep those scored at
 * least MIN_SCORE, skip ranges that cross a chapter or run longer than MAX_RANGE
 * verses, drop verses already covered by a kept range, check every verse exists in
 * the BSB, and keep the best MAX_VERSES. Topics left with fewer than MIN_VERSES are
 * dropped and reported.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BOOKS } from "../src/lib/books";
import { OSIS } from "../src/lib/osis";
import type { BookData } from "../src/lib/scripture";
import { CURATED_SLUGS, topicSlug } from "../src/lib/topics-curated";
import { TOPIC_LIST } from "./topic-list";

const MIN_SCORE = 1;
const MAX_RANGE = 5;
const MAX_VERSES = 12;
const MIN_VERSES = 6;

const srcFlag = process.argv.indexOf("--src");
if (srcFlag < 0 || !process.argv[srcFlag + 1]) throw new Error("Usage: npm run import:topics -- --src <topic-scores.txt>");
const src = path.resolve(process.argv[srcFlag + 1]);

/** OpenBible topic name → passage → best score. */
const scores = new Map<string, Map<string, number>>();
for (const line of readFileSync(src, "utf8").split("\n").slice(1)) {
  const [topic, osis, score] = line.split("\t");
  if (!topic || !osis) continue;
  const key = topic.trim().toLowerCase();
  if (!scores.has(key)) scores.set(key, new Map());
  const m = scores.get(key)!;
  m.set(osis, Math.max(m.get(osis) ?? 0, Number(score)));
}

const bsb = new Map<string, BookData>();
function verseExists(code: string, chapter: number, verse: number): boolean {
  if (!bsb.has(code)) bsb.set(code, JSON.parse(readFileSync(path.join("data", "bsb", `${code}.json`), "utf8")));
  return bsb.get(code)!.chapters[chapter - 1]?.verses.some(([n]) => n === verse) ?? false;
}

const order = new Map(BOOKS.map((b, i) => [b.code, i]));

interface Passage {
  id: string;
  code: string;
  chapter: number;
  start: number;
  end: number;
  score: number;
}

/** "Phil.4.6-Phil.4.7" → PHP 4:6-7, or null if it crosses a chapter, is too long or is unknown. */
function toPassage(osis: string, score: number): Passage | null {
  const [a, b] = osis.split("-");
  const pa = a.split(".");
  const code = OSIS[pa[0]];
  if (!code || pa.length !== 3) return null;
  const chapter = Number(pa[1]);
  const start = Number(pa[2]);
  let end = start;
  if (b) {
    const pb = b.split(".");
    if (pb.length !== 3 || pb[0] !== pa[0] || Number(pb[1]) !== chapter) return null;
    end = Number(pb[2]);
  }
  if (!(end >= start) || end - start + 1 > MAX_RANGE) return null;
  for (let v = start; v <= end; v++) if (!verseExists(code, chapter, v)) return null;
  const id = `${code}.${chapter}.${start}${end > start ? `-${end}` : ""}`;
  return { id, code, chapter, start, end, score };
}

const out: { slug: string; name: string; intro: string; verses: string[] }[] = [];
const dropped: string[] = [];
const seen = new Set<string>();

for (const t of TOPIC_LIST) {
  const slug = topicSlug(t.name);
  if (CURATED_SLUGS.has(slug)) continue;
  if (seen.has(slug)) throw new Error(`Duplicate topic slug ${slug}`);
  seen.add(slug);

  if (t.verses) {
    for (const id of t.verses) {
      const m = id.match(/^([1-3A-Z]{3})\.(\d+)\.(\d+)(?:-(\d+))?$/);
      if (!m) throw new Error(`${t.name}: bad verse id ${id}`);
      for (let v = Number(m[3]); v <= Number(m[4] ?? m[3]); v++) {
        if (!verseExists(m[1], Number(m[2]), v)) throw new Error(`${t.name}: ${id} is not in the BSB`);
      }
    }
    out.push({ slug, name: t.name, intro: t.intro, verses: t.verses });
    continue;
  }

  const keys = t.keys ?? [t.name.toLowerCase()];
  const best = new Map<string, number>();
  for (const k of keys) {
    const m = scores.get(k);
    if (!m) console.warn(`  ${t.name}: no OpenBible topic "${k}"`);
    for (const [osis, s] of m ?? []) best.set(osis, Math.max(best.get(osis) ?? 0, s));
  }

  const candidates = [...best]
    .filter(([, s]) => s >= MIN_SCORE)
    .map(([osis, s]) => toPassage(osis, s))
    .filter((p): p is Passage => p !== null)
    // Best first; on a tie prefer the shorter passage, then Bible order.
    .sort((x, y) => y.score - x.score || x.end - x.start - (y.end - y.start) || order.get(x.code)! - order.get(y.code)! || x.chapter - y.chapter || x.start - y.start);

  const kept: Passage[] = [];
  for (const p of candidates) {
    const overlaps = kept.some((k) => k.code === p.code && k.chapter === p.chapter && p.start <= k.end && k.start <= p.end);
    if (!overlaps) kept.push(p);
    if (kept.length === MAX_VERSES) break;
  }
  if (kept.length < MIN_VERSES) {
    dropped.push(`${t.name} (${kept.length})`);
    continue;
  }
  out.push({ slug, name: t.name, intro: t.intro, verses: kept.map((p) => p.id) });
}

out.sort((a, b) => a.slug.localeCompare(b.slug));
writeFileSync(path.join("data", "topics.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`Wrote ${out.length} topics → data/topics.json`);
if (dropped.length) console.log(`Dropped (fewer than ${MIN_VERSES} verses): ${dropped.join(", ")}`);
