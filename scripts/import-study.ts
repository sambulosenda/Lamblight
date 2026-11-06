/**
 * Build the Study mode data in data/study/ from two open sources:
 *
 *   npm run import:study -- --berean <berean-build/output> --xref <cross_references.txt>
 *
 * - berean-build (github.com/Bridgeconn/berean-build, Apache-2.0): BSB USFM with
 *   each English phrase tagged with its Strong's number and source word, plus the
 *   Nestle Greek / WLC Hebrew USFM and a Strong's dictionary.
 * - OpenBible.info cross references (CC BY), e.g. from
 *   github.com/scrollmapper/bible_databases sources/extras/cross_references.txt.
 *
 * Output (committed, like the Bible text):
 *   data/study/<BOOK>.json   per chapter, per verse: English segments linked to
 *                            original words, the original words, and cross refs
 *   data/study/lexicon.json  Strong's definitions used anywhere in the above
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BOOKS } from "../src/lib/books";
import type { StudyBook, StudyVerse } from "../src/lib/study-types";

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(name);
  if (i < 0 || !args[i + 1]) throw new Error(`Missing ${name} <path>`);
  return path.resolve(args[i + 1]);
};
const bereanDir = arg("--berean");
const xrefFile = arg("--xref");
const outDir = path.resolve("data", "study");
mkdirSync(outDir, { recursive: true });

/** OSIS book names used by OpenBible → our codes. */
const OSIS: Record<string, string> = {
  Gen: "GEN", Exod: "EXO", Lev: "LEV", Num: "NUM", Deut: "DEU", Josh: "JOS", Judg: "JDG", Ruth: "RUT",
  "1Sam": "1SA", "2Sam": "2SA", "1Kgs": "1KI", "2Kgs": "2KI", "1Chr": "1CH", "2Chr": "2CH", Ezra: "EZR",
  Neh: "NEH", Esth: "EST", Job: "JOB", Ps: "PSA", Prov: "PRO", Eccl: "ECC", Song: "SNG", Isa: "ISA",
  Jer: "JER", Lam: "LAM", Ezek: "EZK", Dan: "DAN", Hos: "HOS", Joel: "JOL", Amos: "AMO", Obad: "OBA",
  Jonah: "JON", Mic: "MIC", Nah: "NAM", Hab: "HAB", Zeph: "ZEP", Hag: "HAG", Zech: "ZEC", Mal: "MAL",
  Matt: "MAT", Mark: "MRK", Luke: "LUK", John: "JHN", Acts: "ACT", Rom: "ROM", "1Cor": "1CO", "2Cor": "2CO",
  Gal: "GAL", Eph: "EPH", Phil: "PHP", Col: "COL", "1Thess": "1TH", "2Thess": "2TH", "1Tim": "1TI",
  "2Tim": "2TI", Titus: "TIT", Phlm: "PHM", Heb: "HEB", Jas: "JAS", "1Pet": "1PE", "2Pet": "2PE",
  "1John": "1JN", "2John": "2JN", "3John": "3JN", Jude: "JUD", Rev: "REV",
};
const MAX_XREFS = 12;

/** Split a USFM file into verse bodies keyed "chapter.verse", skipping heading lines. */
function verseBodies(src: string): Map<string, string> {
  const out = new Map<string, string>();
  let chapter = 0;
  let key = "";
  for (const line of src.split(/\r?\n/)) {
    const c = line.match(/^\\c\s+(\d+)/);
    if (c) {
      chapter = Number(c[1]);
      key = "";
      continue;
    }
    // Headings, references and titles are not verse text.
    if (/^\\(s\d?|r|ms\d?|mr|d|sp|qa|mt\d?|h|toc\d|id|ide|usfm)\b/.test(line)) continue;
    const parts = line.split(/\\v\s+(\d+)\s/);
    // parts: [before, num, body, num, body...]
    if (key) out.set(key, (out.get(key) ?? "") + " " + parts[0]);
    for (let i = 1; i < parts.length; i += 2) {
      key = `${chapter}.${parts[i]}`;
      out.set(key, (out.get(key) ?? "") + " " + parts[i + 1]);
    }
  }
  return out;
}

const tidy = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?’”)\]])/g, "$1")
    .replace(/([“‘(\[])\s+/g, "$1")
    .trim();

/** English verse → segments: [text] for plain text, [text, wordIndex] for a tagged phrase. */
function englishSegments(body: string): StudyVerse["e"] {
  const clean = body
    .replace(/\\x\s.*?\\x\*/g, " ")
    .replace(/\\f\s.*?\\f\*/g, " ")
    .replace(/\\add\*?/g, " ")
    .replace(/\\nd\*?/g, "");
  const re = /\\w\s+(.*?)\s*\|strong="[^"]*"\s+srcloc="\w+:[A-Z0-9]+\.\d+\.\d+\.(\d+)"\s*\\w\*/g;
  const segs: StudyVerse["e"] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const plain = (s: string) => {
    const t = tidy(s.replace(/\\[a-z]+\d*\*?/g, " "));
    if (t) segs.push([t]);
  };
  while ((m = re.exec(clean))) {
    plain(clean.slice(last, m.index));
    const t = tidy(m[1]);
    if (t) segs.push([t, Number(m[2]) - 1]);
    last = re.lastIndex;
  }
  plain(clean.slice(last));
  return segs;
}

/** Original-language verse → words [form, translit, morph, strong]. */
function originalWords(body: string, prefix: "G" | "H"): StudyVerse["o"] {
  const re = /\\w\s+([^|]+?)\s*\|strong="(\d+)"[^\\]*?x-morph="([^"]*)"\s+x-translit="([^"]*)"\s*\\w\*/g;
  const out: StudyVerse["o"] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) out.push([m[1].replace(/[׃]$/, "").trim(), m[4], m[3], `${prefix}${Number(m[2])}`]);
  return out;
}

// Strong's dictionary
const lexAll = new Map<string, string>();
{
  const md = readFileSync(path.join(bereanDir, "Strongs_dictionary.md"), "utf8");
  for (const block of md.split(/^## /m).slice(1)) {
    const nl = block.indexOf("\n");
    const key = block.slice(0, nl).trim().replace(/^([GH])0*(\d+)$/, "$1$2");
    const def = block
      .slice(nl + 1)
      .trim()
      .replace(/\s*<BR>\s*/g, "\n")
      .replace(/\|/g, "“")
      .trim();
    if (def) lexAll.set(key, def);
  }
}

// Cross references
const xrefs = new Map<string, [string, number][]>();
{
  const lines = readFileSync(xrefFile, "utf8").split(/\r?\n/).slice(1);
  const id = (osis: string) => {
    const [b, c, v] = osis.split(".");
    return OSIS[b] ? `${OSIS[b]}.${c}.${v}` : null;
  };
  for (const line of lines) {
    const [from, to, votes] = line.split("\t");
    if (!from || !to) continue;
    const f = id(from);
    const [a, z] = to.split("-");
    const ta = id(a);
    const tz = z ? id(z) : null;
    if (!f || !ta || Number(votes) < 1) continue;
    // Keep ranges within one chapter as "JHN.3.16-18"; others become their first verse.
    let target = ta;
    if (tz) {
      const [ab, ac] = ta.split(".");
      const [zb, zc, zv] = tz.split(".");
      if (ab === zb && ac === zc) target = `${ta}-${zv}`;
    }
    const list = xrefs.get(f) ?? [];
    list.push([target, Number(votes)]);
    xrefs.set(f, list);
  }
}

const usedLex = new Set<string>();
let verseCount = 0;
let bytes = 0;
for (const book of BOOKS) {
  const eng = verseBodies(readFileSync(path.join(bereanDir, "bsb_usfms", `bsb_${book.code}.usfm`), "utf8"));
  const prefix = book.testament === "NT" ? "G" : "H";
  const srcDir = prefix === "G" ? "grk_usfms" : "heb_usfms";
  const srcFile = `${prefix === "G" ? "grk" : "heb"}_${book.code}.usfm`;
  const orig = verseBodies(readFileSync(path.join(bereanDir, srcDir, srcFile), "utf8"));
  const data: StudyBook = { code: book.code, chapters: {} };
  for (const [key, body] of eng) {
    const [c, v] = key.split(".");
    const words = originalWords(orig.get(key) ?? "", prefix);
    for (const w of words) if (lexAll.has(w[3])) usedLex.add(w[3]);
    const refs = (xrefs.get(`${book.code}.${key}`) ?? [])
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_XREFS)
      .map(([r]) => r);
    const verse: StudyVerse = { e: englishSegments(body), o: words, x: refs };
    (data.chapters[c] ??= {})[v] = verse;
    verseCount++;
  }
  const json = JSON.stringify(data);
  bytes += json.length;
  writeFileSync(path.join(outDir, `${book.code}.json`), json);
}
const lexicon = Object.fromEntries([...usedLex].sort().map((k) => [k, lexAll.get(k)!]));
const lexJson = JSON.stringify(lexicon);
writeFileSync(path.join(outDir, "lexicon.json"), lexJson);
console.log(`Study data: ${verseCount} verses, ${(bytes / 1e6).toFixed(1)} MB; lexicon ${usedLex.size} entries, ${(lexJson.length / 1e6).toFixed(1)} MB`);
