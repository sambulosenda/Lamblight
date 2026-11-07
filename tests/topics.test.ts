import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BookData } from "../src/lib/scripture";
import { HOME_TOPICS, TOPICS, parseTopicVerse, topicBySlug } from "../src/lib/topics";

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
});

describe("topicForQuery", () => {
  it("finds the topic a search is about", async () => {
    const { topicForQuery } = await import("../src/lib/topics");
    expect(topicForQuery("anxious")?.slug).toBe("anxiety");
    expect(topicForQuery("do not be anxious")?.slug).toBe("anxiety");
    expect(topicForQuery("hopeless")?.slug).toBe("hope");
    expect(topicForQuery("loved")?.slug).toBe("love");
    expect(topicForQuery("jesus wept")).toBeUndefined();
  });
});
