import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BookData } from "../src/lib/scripture";
import { HOME_TOPICS, TOPICS, parseTopicVerse, relatedTopics, topicBySlug, topicsForVerse } from "../src/lib/topics";
import { topicSlug } from "../src/lib/topics-curated";

const books = new Map<string, BookData>();
const load = (code: string) => {
  if (!books.has(code)) books.set(code, JSON.parse(readFileSync(`data/bsb/${code}.json`, "utf8")));
  return books.get(code)!;
};

describe("topics", () => {
  it("every topic verse exists in the BSB", () => {
    for (const topic of TOPICS) {
      for (const id of topic.verses) {
        const { code, chapter, start, end } = parseTopicVerse(id);
        const ch = load(code).chapters[chapter - 1];
        expect(ch, id).toBeDefined();
        for (let v = start; v <= end; v++) expect(ch.verses.some(([n]) => n === v), `${id} verse ${v}`).toBe(true);
      }
    }
  });

  it("home topics are real topics", () => {
    for (const slug of HOME_TOPICS) expect(topicBySlug(slug)).toBeDefined();
  });

  it("has curated topics first, then imported ones, with unique slugs", () => {
    expect(TOPICS.length).toBeGreaterThan(150);
    expect(TOPICS[0].source).toBe("curated");
    expect(new Set(TOPICS.map((t) => t.slug)).size).toBe(TOPICS.length);
    for (const t of TOPICS) expect(t.verses.length, t.slug).toBeGreaterThanOrEqual(6);
  });

  it("makes slugs and mid-sentence phrases", () => {
    expect(topicSlug("God’s love")).toBe("gods-love");
    expect(topicSlug("the armor of God")).toBe("armor-of-god");
    expect(topicBySlug("gods-love")).toMatchObject({ name: "God’s love", phrase: "God’s love" });
    expect(topicBySlug("anxiety")).toMatchObject({ name: "Anxiety", phrase: "anxiety" });
  });

  it("finds the topics a verse appears in, including inside a range", () => {
    expect(topicsForVerse("PHP.4.7").map((t) => t.slug)).toContain("anxiety");
    expect(topicsForVerse("JHN.3.16").length).toBeGreaterThan(0);
    expect(topicsForVerse("NUM.7.30")).toEqual([]);
  });

  it("relates topics that share verses", () => {
    const anxiety = topicBySlug("anxiety")!;
    const related = relatedTopics(anxiety);
    expect(related.length).toBeGreaterThan(0);
    expect(related).not.toContain(anxiety);
  });

  it("hand-picks the verses for suicide", () => {
    expect(topicBySlug("suicide")?.verses[0]).toBe("PSA.34.18");
  });
});

describe("topicForQuery", () => {
  it("finds the topic a search is about", async () => {
    const { topicForQuery } = await import("../src/lib/topics");
    expect(topicForQuery("anxious")?.slug).toBe("anxiety");
    expect(topicForQuery("do not be anxious")?.slug).toBe("anxiety");
    expect(topicForQuery("hopeless")?.slug).toBe("hope");
    expect(topicForQuery("loved")?.slug).toBe("love");
    expect(topicForQuery("jesus wept")).toBeUndefined();
    expect(topicForQuery("bible verses about marriage")?.slug).toBe("marriage");
    expect(topicForQuery("gods love")?.slug).toBe("gods-love");
    expect(topicForQuery("verses for husbands")?.slug).toBe("husbands");
  });
});
