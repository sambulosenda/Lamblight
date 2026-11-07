import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { searchVerses } = await import("../src/lib/search");

const ref = (h: { book: { code: string }; chapter: number; verse: number }) => `${h.book.code}.${h.chapter}.${h.verse}`;

describe("searchVerses (BSB)", () => {
  it("puts John 3:16 first for 'for god so loved'", async () => {
    const { hits } = await searchVerses("bsb", "for god so loved");
    expect(ref(hits[0])).toBe("JHN.3.16");
  });

  it("ranks Philippians 4:6 first for 'anxious'", async () => {
    const { hits } = await searchVerses("bsb", "anxious");
    expect(ref(hits[0])).toBe("PHP.4.6");
  });

  it("finds phrases from well-known verses", async () => {
    const { hits } = await searchVerses("bsb", "lamp to my feet");
    expect(ref(hits[0])).toBe("PSA.119.105");
  });
});

describe("search filters and spread", () => {
  it("counts matches in each testament and filters by one", async () => {
    const all = await searchVerses("bsb", "anxious");
    expect(all.spread.OT + all.spread.NT).toBe(all.total);
    const nt = await searchVerses("bsb", "anxious", 50, "NT");
    expect(nt.total).toBe(all.spread.NT);
    expect(nt.hits.every((h) => h.book.testament === "NT")).toBe(true);
    expect(nt.spread).toEqual(all.spread);
  });
});
