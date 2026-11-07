import imported from "../../data/topics.json";
import { CURATED_SLUGS, CURATED_TOPICS } from "./topics-curated";

/**
 * Topic pages ("Verses about anxiety"): the hand-written topics in topics-curated.ts,
 * then the ones built by scripts/import-topics.ts from OpenBible.info (CC BY).
 * Each verse is a canonical ID, optionally with a range end in the same chapter: "PHP.4.6-7".
 */
export interface Topic {
  slug: string;
  /** For headings and links: "God’s love", "Anxiety". */
  name: string;
  /** Mid-sentence, after "Verses about": "God’s love", "anxiety". */
  phrase: string;
  /** One line under the title. */
  intro: string;
  verses: string[];
  /** Imported topics credit OpenBible.info. */
  source: "curated" | "openbible";
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const TOPICS: Topic[] = [
  ...CURATED_TOPICS.map((t) => ({ ...t, phrase: t.name.toLowerCase(), source: "curated" as const })),
  ...(imported as { slug: string; name: string; intro: string; verses: string[] }[])
    .filter((t) => !CURATED_SLUGS.has(t.slug))
    .map((t) => ({ slug: t.slug, name: capitalise(t.name), phrase: t.name, intro: t.intro, verses: t.verses, source: "openbible" as const })),
];

/** Topics shown on the home page. */
export const HOME_TOPICS = ["anxiety", "hope", "strength", "grief"];

const BY_SLUG = new Map(TOPICS.map((t) => [t.slug, t]));

export function topicBySlug(slug: string): Topic | undefined {
  return BY_SLUG.get(slug);
}

export interface TopicVerseRef {
  code: string;
  chapter: number;
  start: number;
  end: number;
}

export function parseTopicVerse(id: string): TopicVerseRef {
  const m = id.match(/^([1-3A-Z]{3})\.(\d+)\.(\d+)(?:-(\d+))?$/);
  if (!m) throw new Error(`Bad topic verse id ${id}`);
  const start = Number(m[3]);
  const end = m[4] ? Number(m[4]) : start;
  if (end < start) throw new Error(`Bad topic verse id ${id}: range ends before it starts`);
  return { code: m[1], chapter: Number(m[2]), start, end };
}

/** Every single verse a topic lists, ranges expanded: "JHN.3.16". */
function expand(id: string): string[] {
  const { code, chapter, start, end } = parseTopicVerse(id);
  return Array.from({ length: end - start + 1 }, (_, i) => `${code}.${chapter}.${start + i}`);
}

let verseIndex: Map<string, Topic[]> | null = null;

/** Topics that list this verse (alone or in a range), curated first. */
export function topicsForVerse(verseId: string): Topic[] {
  if (!verseIndex) {
    verseIndex = new Map();
    for (const t of TOPICS) {
      for (const v of new Set(t.verses.flatMap(expand))) {
        if (!verseIndex.has(v)) verseIndex.set(v, []);
        verseIndex.get(v)!.push(t);
      }
    }
  }
  return verseIndex.get(verseId) ?? [];
}

/**
 * Topics that share the most verses with this one, for "Related topics". A shared verse
 * counts for less the more topics list it, so John 3:16 doesn't relate everything.
 */
export function relatedTopics(topic: Topic, limit = 8): Topic[] {
  const counts = new Map<Topic, number>();
  // Each passage counts once, however many verses it spans.
  for (const id of topic.verses) {
    const all = new Set(expand(id).flatMap(topicsForVerse));
    for (const t of all) if (t !== topic) counts.set(t, (counts.get(t) ?? 0) + 1 / all.size);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].slug.localeCompare(b[0].slug))
    .slice(0, limit)
    .map(([t]) => t);
}

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/([^s])s$/, "$1"));

const STOP = new Set(["the", "your", "of", "a", "we", "and"]);

/**
 * The topic page a search is probably looking for. Curated topics match on the first
 * four letters of a word ("anxious" → Anxiety, "hopeless" → Hope). Imported topics
 * need every word of their name in the query ("bible verses about marriage" → Marriage).
 */
export function topicForQuery(query: string): Topic | undefined {
  const q = words(query);
  const qs = new Set(q);
  const matches = TOPICS.filter((t) => t.source === "openbible")
    .map((t) => ({ t, need: words(t.phrase).filter((w) => !STOP.has(w)) }))
    .filter(({ need }) => need.length > 0 && need.join("").length >= 4 && need.every((w) => qs.has(w)))
    .sort((a, b) => b.need.length - a.need.length);
  // A multi-word topic ("God’s love") is more specific than a curated prefix match ("love").
  if (matches[0] && matches[0].need.length > 1) return matches[0].t;
  const long = q.filter((w) => w.length >= 4);
  const curated = TOPICS.find((t) => t.source === "curated" && long.some((w) => t.slug.startsWith(w.slice(0, 4))));
  return curated ?? matches[0]?.t;
}
