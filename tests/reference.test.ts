import { describe, expect, it } from "vitest";
import { findBook, parseReference } from "../src/lib/reference";

describe("parseReference", () => {
  const cases: [string, string, number?, number?, number?][] = [
    ["jn 3 16", "JHN", 3, 16],
    ["John 3:16", "JHN", 3, 16],
    ["john3:16", "JHN", 3, 16],
    ["Jhon 3:16", "JHN", 3, 16],
    ["1 cor 13", "1CO", 13],
    ["1cor13:4-7", "1CO", 13, 4, 7],
    ["I Corinthians 13", "1CO", 13],
    ["psalm 23", "PSA", 23],
    ["ps 119.105", "PSA", 119, 105],
    ["Song of Songs 2", "SNG", 2],
    ["jude 3", "JUD", 1, 3],
    ["Phil 4:6", "PHP", 4, 6],
    ["phlm 1", "PHM", 1],
    ["genesis", "GEN"],
    ["Revelation 22:21", "REV", 22, 21],
    ["1 jn 4:8", "1JN", 4, 8],
  ];
  for (const [input, code, chapter, verse, verseEnd] of cases) {
    it(input, () => {
      const r = parseReference(input);
      expect(r?.book.code).toBe(code);
      expect(r?.chapter).toBe(chapter);
      expect(r?.verse).toBe(verse);
      expect(r?.verseEnd).toBe(verseEnd);
    });
  }

  it("rejects keyword searches", () => {
    expect(parseReference("for god so loved")).toBeNull();
    expect(parseReference("do not be anxious")).toBeNull();
    expect(parseReference("love")).toBeNull();
  });

  it("rejects out-of-range chapters", () => {
    expect(parseReference("john 22")).toBeNull();
  });

  it("finds books by prefix", () => {
    expect(findBook("gene")?.code).toBe("GEN");
    expect(findBook("philip")?.code).toBe("PHP");
  });
});
