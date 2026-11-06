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
