import { describe, expect, it } from "vitest";
import { parseUsfm } from "../src/lib/usfm";

const SAMPLE = String.raw`\id PSA - Berean Standard Bible
\h Psalms
\toc2 Psalms
\mt1 Psalms
\c 23
\s1 The LORD Is My Shepherd
\d A Psalm of David.
\q1
\v 1 The \nd Lord\nd* is my shepherd;\f + \fr 23:1 \ft See \+xt Revelation 7:17\+xt*.\f*
\q2 I shall not want.
\b
\q1
\v 2 He makes me lie down
\c 24
\p
\v 1 The earth is the \nd Lord\nd*’s,\f + \fr 24:1 \fq \+nd Lord\+nd*\ft or \fqa God\f* and the fullness thereof.
\p He said, “Yes.”
\v 3 Skipped two.`;

describe("parseUsfm", () => {
  const { book, title, warnings } = parseUsfm(SAMPLE);

  it("reads book metadata", () => {
    expect(book.code).toBe("PSA");
    expect(title).toBe("Psalms");
    expect(warnings).toEqual([]);
  });

  it("splits chapters and keeps verse text without notes or headings", () => {
    expect(book.chapters.map((c) => c.n)).toEqual([23, 24]);
    expect(book.chapters[0].verses).toEqual([
      [1, "The LORD is my shepherd; I shall not want."],
      [2, "He makes me lie down"],
    ]);
  });

  it("keeps verses that span paragraphs, and missing verses stay missing", () => {
    expect(book.chapters[1].verses).toEqual([
      [1, "The earth is the LORD’s, and the fullness thereof. He said, “Yes.”"],
      [3, "Skipped two."],
    ]);
  });

  it("builds poetry blocks with verse markers, divine names and note calls", () => {
    const blocks = book.chapters[0].blocks;
    expect(blocks.map((b) => b.t)).toEqual(["s1", "d", "q1", "q2", "b", "q1"]);
    expect(blocks[2].c).toEqual([{ v: 1 }, "The ", { nd: "Lord" }, " is my shepherd;", { f: 0 }]);
  });

  it("collects footnotes with their reference and tidy text", () => {
    expect(book.chapters[0].notes).toEqual([{ v: 1, ref: "23:1", text: "See Revelation 7:17." }]);
    expect(book.chapters[1].notes[0].text).toBe("LORD or God");
  });
});

describe("parseUsfm word attributes (WEB/KJV files from ebible.org)", () => {
  it("drops |strong= attributes and keeps the words", () => {
    const { book } = parseUsfm(String.raw`\id JHN
\c 3
\p
\v 16 \w For|strong="G1063"\w* \w God|strong="G2316"\w* \w so|strong="G3779"\w* \add loved\add* \+w world|lemma="kosmos"\+w*.`);
    expect(book.chapters[0].verses).toEqual([[16, "For God so loved world."]]);
  });
});
