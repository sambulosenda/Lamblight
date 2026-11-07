import { HEADING_BLOCKS, type Block, type BookData, type Chapter, type Footnote, type Inline } from "./scripture";

/**
 * A small USFM parser covering the markers used by the BSB, WEB, KJV, ASV and YLT
 * files on ebible.org. It produces structured blocks for the reader plus a plain
 * text string per verse for verse pages, search and copy.
 *
 * Unknown paragraph markers become blocks with their marker name; unknown
 * character markers keep their text. Both are reported in `warnings`.
 */

const PARAGRAPH_MARKERS = new Set([
  "p", "m", "pmo", "pm", "pi", "pi1", "pi2", "pc", "pr", "nb", "mi", "cls",
  "li", "li1", "li2", "li3",
  "q", "q1", "q2", "q3", "qr", "qc", "qm1", "qm2",
  "b",
  "s", "s1", "s2", "s3", "r", "d", "ms", "ms1", "mr", "qa", "sp",
]);

/** Book-level markers whose text is metadata, not Scripture. */
const BOOK_META_MARKERS = new Set([
  "id", "ide", "h", "toc1", "toc2", "toc3", "mt", "mt1", "mt2", "mt3", "rem", "sts", "usfm", "imt", "ip", "is",
]);

/** Character markers whose content we keep as plain text (styling dropped for now). */
const PLAIN_CHAR_MARKERS = new Set([
  "add", "bk", "dc", "em", "it", "bd", "bdit", "no", "sc", "wj", "qs", "qt", "tl", "pn", "k", "w", "sls", "ord", "sig",
]);

/** Footnote/cross-reference internals. */
const NOTE_MARKERS = new Set(["fr", "ft", "fq", "fqa", "fk", "fl", "fw", "fp", "fv", "fdc", "fm", "xt", "xo", "xk", "xq"]);

const ALIASES: Record<string, string> = { q: "q1", li: "li1", pi: "pi1", s: "s1", ms1: "ms", mt: "mt1" };

export interface ParseResult {
  book: BookData;
  title?: string;
  warnings: string[];
}

interface Token {
  marker: string;
  plus: boolean;
  close: boolean;
}

/** Split USFM into alternating text and marker tokens. */
function tokenize(src: string): (string | Token)[] {
  const out: (string | Token)[] = [];
  const re = /\\(\+?)([a-z]+[0-9]*)(\*?)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) {
      let text = src.slice(last, m.index);
      // USFM 3 word attributes sit before a closing marker: \w grace|strong="G5485"\w*
      if (m[3]) text = text.replace(/\|[^|\\]*$/, "");
      if (text) out.push(text);
    }
    out.push({ marker: m[2], plus: m[1] === "+", close: m[3] === "*" });
    last = re.lastIndex;
    // An opening marker swallows one following space.
    if (!m[3] && src[last] === " ") {
      last++;
      re.lastIndex = last;
    }
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

const squash = (s: string) => s.replace(/\s+/g, " ");

export function parseUsfm(src: string, fallbackCode?: string): ParseResult {
  const warnings: string[] = [];
  const tokens = tokenize(src.replace(/\r\n?/g, "\n"));

  let code = fallbackCode ?? "";
  let title: string | undefined;
  const chapters: Chapter[] = [];

  let chapter = null as Chapter | null;
  let block = null as Block | null;
  let verse = 0;
  let verseText = new Map<number, string>();

  // Modes for the text that follows a marker.
  let meta: string | null = null; // collecting book metadata for this marker
  let metaText = "";
  let expect: "chapter" | "verse" | null = null;
  let note: { ref: string; text: string; inRef: boolean; skipCaller: boolean; xref: boolean; ndStart?: number } | null = null;
  let nd: string | null = null; // collecting divine-name text in the body

  const finishChapter = () => {
    if (!chapter) return;
    chapter.verses = [...verseText.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([n, t]) => [n, squash(dropNoteGaps(t)).trim()] as [number, string]);
    // Trim trailing whitespace in blocks and drop empty ones (keep "b").
    chapter.blocks = chapter.blocks.filter((bl) => {
      trimBlock(bl);
      return bl.t === "b" || bl.c.length > 0;
    });
    chapters.push(chapter);
  };

  const finishMeta = () => {
    if (meta === null) return;
    const text = squash(metaText).trim();
    if (meta === "id" && !fallbackCode) code = text.slice(0, 3).toUpperCase();
    if (meta === "id" && fallbackCode && text.slice(0, 3).toUpperCase() !== fallbackCode) {
      warnings.push(`\\id ${text.slice(0, 3)} does not match expected ${fallbackCode}`);
    }
    if ((meta === "toc2" || meta === "h") && !title) title = text;
    meta = null;
    metaText = "";
  };

  const inVerseBody = () => block !== null && !HEADING_BLOCKS.has(block.t) && verse > 0;

  const appendVerse = (s: string) => {
    if (!inVerseBody()) return;
    verseText.set(verse, (verseText.get(verse) ?? "") + s);
  };

  const pushInline = (item: Inline) => {
    if (!chapter) return;
    if (!block) {
      block = { t: "p", c: [] };
      chapter.blocks.push(block);
    }
    const prev = block.c[block.c.length - 1];
    // "Dara \f…\f*—five": drop the space left before a footnote when punctuation follows it.
    const beforeNote = block.c[block.c.length - 2];
    if (typeof item === "string" && PUNCT_AFTER_NOTE.test(item) && typeof prev === "object" && "f" in prev && typeof beforeNote === "string") {
      block.c[block.c.length - 2] = beforeNote.replace(/\s+$/, "");
    }
    if (typeof item === "string" && typeof prev === "string") block.c[block.c.length - 1] = prev + item;
    else block.c.push(item);
  };

  const handleText = (raw: string) => {
    if (meta !== null) {
      metaText += raw;
      return;
    }
    let text = raw;
    if (expect === "chapter") {
      const m = text.match(/^\s*(\d+)/);
      expect = null;
      if (!m) {
        warnings.push(`bad chapter marker near "${text.slice(0, 20)}"`);
        return;
      }
      finishChapter();
      chapter = { n: Number(m[1]), blocks: [], verses: [], notes: [] };
      block = null;
      verse = 0;
      verseText = new Map();
      text = text.slice(m[0].length);
    } else if (expect === "verse") {
      const m = text.match(/^\s*(\d+)(?:[-–](\d+))?[a-z]?\s?/);
      expect = null;
      if (!m) {
        warnings.push(`bad verse marker in chapter ${chapter?.n}`);
      } else {
        verse = Number(m[1]);
        if (m[2]) warnings.push(`verse range ${m[1]}-${m[2]} in chapter ${chapter?.n}; stored as ${m[1]}`);
        pushInline({ v: verse });
        if (inVerseBody() && verseText.has(verse)) warnings.push(`duplicate verse ${chapter?.n}:${verse}`);
        text = text.slice(m[0].length);
      }
    }

    if (note) {
      if (note.skipCaller) {
        // The caller ("+", "-" or a character) comes straight after \f.
        text = text.replace(/^\s*\S\s?/, "");
        note.skipCaller = false;
      }
      if (note.inRef) note.ref += text;
      else note.text += text;
      return;
    }

    if (!chapter) {
      if (text.trim()) warnings.push(`text before first chapter: "${text.trim().slice(0, 30)}"`);
      return;
    }

    const flat = text.replace(/\n/g, " ");
    if (!flat) return;
    if (nd !== null) {
      nd += flat;
      return;
    }
    // Leading space at the very start of a block is noise.
    const current = block as Block | null;
    if (!current || current.c.length === 0) {
      const trimmed = flat.replace(/^\s+/, "");
      if (!trimmed) return;
      pushInline(squash(trimmed));
      appendVerse(trimmed);
      return;
    }
    pushInline(squash(flat));
    appendVerse(flat);
  };

  for (const tok of tokens) {
    if (typeof tok === "string") {
      handleText(tok);
      continue;
    }
    const { close, plus } = tok;
    const marker = ALIASES[tok.marker] ?? tok.marker;

    // Inside a footnote, everything up to \f* belongs to the note.
    if (note) {
      if ((marker === "f" || marker === "fe" || marker === "x") && close) {
        if (chapter && !note.xref) {
          const fn: Footnote = { v: verse, ref: squash(note.ref).trim(), text: tidyNote(note.text) };
          chapter.notes.push(fn);
          pushInline({ f: chapter.notes.length - 1 });
          appendVerse(NOTE_GAP);
        }
        note = null;
      } else if (marker === "nd") {
        // Divine name inside a note: uppercase it, as the body text does.
        if (!close) {
          if (note.text && !/\s$/.test(note.text)) note.text += " ";
          note.ndStart = note.text.length;
        } else if (note.ndStart !== undefined) {
          note.text = note.text.slice(0, note.ndStart) + note.text.slice(note.ndStart).toUpperCase();
          note.ndStart = undefined;
        }
      } else if (marker === "fr" && !close) {
        note.inRef = true;
      } else if (NOTE_MARKERS.has(marker) || PLAIN_CHAR_MARKERS.has(marker)) {
        if (!close && marker !== "fr") {
          note.inRef = false;
          // Note segments (\ft, \fq, \+nd...) are separate runs; keep a word gap between them.
          if (note.text && !/\s$/.test(note.text)) note.text += " ";
        }
        if (close && marker === "fr") note.inRef = false;
      } else {
        warnings.push(`unexpected \\${marker} inside footnote`);
      }
      continue;
    }

    if (close) {
      if (marker === "nd" && nd !== null) {
        pushInline({ nd: squash(nd) });
        appendVerse(nd.toUpperCase());
        nd = null;
      }
      // Other closing character markers need no action: their text was kept.
      continue;
    }

    if (BOOK_META_MARKERS.has(marker)) {
      finishMeta();
      meta = marker;
      continue;
    }
    finishMeta();

    if (marker === "c") {
      expect = "chapter";
      continue;
    }
    if (marker === "v") {
      expect = "verse";
      continue;
    }
    if (marker === "f" || marker === "fe" || marker === "x") {
      // Cross-reference notes (\x) are dropped for now; they arrive with the study view.
      note = { ref: "", text: "", inRef: false, skipCaller: true, xref: marker === "x" };
      continue;
    }
    if (marker === "nd" && !plus) {
      nd = "";
      continue;
    }
    if (PARAGRAPH_MARKERS.has(marker)) {
      if (!chapter) {
        warnings.push(`\\${marker} before first chapter`);
        continue;
      }
      if (block) trimBlock(block);
      block = { t: marker, c: [] };
      chapter.blocks.push(block);
      continue;
    }
    if (PLAIN_CHAR_MARKERS.has(marker) || NOTE_MARKERS.has(marker)) continue;
    warnings.push(`unknown marker \\${marker}`);
  }
  finishMeta();
  finishChapter();

  if (!code) warnings.push("no book code found");
  return { book: { code, chapters }, title, warnings };
}

function trimBlock(block: Block) {
  const last = block.c[block.c.length - 1];
  if (typeof last === "string") {
    const t = last.replace(/\s+$/, "");
    if (t) block.c[block.c.length - 1] = t;
    else block.c.pop();
  }
}

/** Marks where a footnote was removed from a verse's plain text. */
const NOTE_GAP = "\u0000";
const PUNCT_AFTER_NOTE = /^[,.;:!?)\]”’—]/;

/** Some sources put a space before a footnote ("Dara \f…\f*—five"); drop it when punctuation follows. */
function dropNoteGaps(text: string): string {
  return text.replace(/\s*\u0000(?=[,.;:!?)\]”’—])/g, "").replaceAll(NOTE_GAP, "");
}

/** Collapse whitespace and drop spaces that ended up before punctuation. */
function tidyNote(text: string): string {
  return squash(text)
    .replace(/\s+([,.;:!?)\]”’])/g, "$1")
    .trim();
}
