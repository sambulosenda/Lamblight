import { describe, expect, it } from "vitest";
import { diffWords } from "../src/lib/word-diff";

const shaded = (a: string, b: string) => diffWords(a, b).filter((p) => p.differs).map((p) => p.text);

describe("diffWords", () => {
  it("shades the words that differ between two versions", () => {
    const bsb = "For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.";
    const kjv = "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.";
    expect(shaded(bsb, kjv)).toEqual(["one and", "everyone who believes", "shall", "eternal"]);
  });

  it("ignores case and punctuation, and keeps the text intact", () => {
    const parts = diffWords("Jesus wept.", "jesus wept");
    expect(parts).toEqual([{ text: "Jesus wept.", differs: false }]);
    const text = "Just as Moses lifted up the snake in the wilderness,";
    expect(diffWords(text, "And as Moses lifted up the serpent in the wilderness,").map((p) => p.text).join("")).toBe(text);
  });

  it("handles an empty verse", () => {
    expect(diffWords("", "anything")).toEqual([]);
    expect(diffWords("Amen.", "")).toEqual([{ text: "Amen.", differs: true }]);
  });
});
