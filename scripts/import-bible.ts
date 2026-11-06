/**
 * Import a public-domain Bible from USFM into data/<version>/.
 *
 *   npm run import -- bsb                     # download the version's zip from ebible.org
 *   npm run import -- bsb --src ./path/usfm   # use a folder of .usfm/.sfm files you already have
 *
 * Output: data/<version>/meta.json and one data/<version>/<BOOK>.json per book
 * (see src/lib/scripture.ts for the shape). The output is committed so builds
 * never depend on ebible.org being reachable.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { BOOKS, bookByCode } from "../src/lib/books";
import type { VersionMeta } from "../src/lib/scripture";
import { parseUsfm } from "../src/lib/usfm";

interface SourceConfig {
  abbreviation: string;
  name: string;
  language: string;
  copyright: string;
  /** ebible.org USFM zip. */
  url: string;
}

const SOURCES: Record<string, SourceConfig> = {
  bsb: {
    abbreviation: "BSB",
    name: "Berean Standard Bible",
    language: "en",
    copyright:
      "The Holy Bible, Berean Standard Bible, BSB is produced in cooperation with Bible Hub, Discovery Bible, OpenBible.com, and the Berean Bible Translation Committee. This text of God's Word has been dedicated to the public domain.",
    url: "https://ebible.org/Scriptures/engbsb_usfm.zip",
  },
  web: {
    abbreviation: "WEB",
    name: "World English Bible",
    language: "en",
    copyright: "The World English Bible is in the public domain.",
    url: "https://ebible.org/Scriptures/engwebp_usfm.zip",
  },
  kjv: {
    abbreviation: "KJV",
    name: "King James Version",
    language: "en",
    copyright: "King James Version. Public domain outside the United Kingdom; in the UK, rights are vested in the Crown.",
    url: "https://ebible.org/Scriptures/eng-kjv2006_usfm.zip",
  },
  asv: {
    abbreviation: "ASV",
    name: "American Standard Version",
    language: "en",
    copyright: "The American Standard Version (1901) is in the public domain.",
    url: "https://ebible.org/Scriptures/eng-asv_usfm.zip",
  },
  ylt: {
    abbreviation: "YLT",
    name: "Young’s Literal Translation",
    language: "en",
    copyright: "Young’s Literal Translation (1898) is in the public domain.",
    url: "https://ebible.org/Scriptures/engylt_usfm.zip",
  },
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(usfm|sfm)$/i.test(name) ? [full] : [];
  });
}

async function download(url: string): Promise<string> {
  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const dir = mkdtempSync(path.join(tmpdir(), "lamplight-usfm-"));
  const zip = path.join(dir, "src.zip");
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  execFileSync("unzip", ["-q", zip, "-d", path.join(dir, "usfm")]);
  return path.join(dir, "usfm");
}

/** Guess the book code from a file name such as 44JHNBSB.usfm or 44-JHNengbsb.usfm. */
function codeFromFilename(file: string): string | undefined {
  const base = path.basename(file).toUpperCase();
  for (const book of BOOKS) {
    const re = new RegExp(`^\\d{2}-?${book.code}`);
    if (re.test(base)) return book.code;
  }
  return undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const id = (args.find((a) => !a.startsWith("--")) ?? "bsb").toLowerCase();
  const srcFlag = args.indexOf("--src");
  const config = SOURCES[id];
  if (!config) throw new Error(`Unknown version "${id}". Known: ${Object.keys(SOURCES).join(", ")}`);

  let srcDir = srcFlag >= 0 ? path.resolve(args[srcFlag + 1]) : "";
  let cleanup = "";
  if (!srcDir) {
    srcDir = await download(config.url);
    cleanup = path.dirname(srcDir);
  }

  const outDir = path.resolve("data", id);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const seen = new Set<string>();
  let verseCount = 0;
  let warningCount = 0;

  for (const file of walk(srcDir).sort()) {
    const src = readFileSync(file, "utf8");
    const idLine = src.match(/\\id\s+([A-Z0-9]{3})/);
    const code = idLine?.[1] ?? codeFromFilename(file);
    const book = code ? bookByCode(code) : undefined;
    if (!book) continue; // front matter, glossary, deuterocanon, etc.

    const { book: data, warnings } = parseUsfm(src, book.code);
    for (const w of warnings) console.warn(`  ${book.code}: ${w}`);
    warningCount += warnings.length;

    if (data.chapters.length !== book.chapters) {
      throw new Error(`${book.code}: expected ${book.chapters} chapters, found ${data.chapters.length}`);
    }
    data.chapters.forEach((ch, i) => {
      if (ch.n !== i + 1) throw new Error(`${book.code}: chapter ${i + 1} is numbered ${ch.n}`);
      if (ch.verses.length === 0) throw new Error(`${book.code} ${ch.n}: no verses`);
      verseCount += ch.verses.length;
    });

    writeFileSync(path.join(outDir, `${book.code}.json`), JSON.stringify(data));
    seen.add(book.code);
  }

  const missing = BOOKS.filter((b) => !seen.has(b.code)).map((b) => b.code);
  if (missing.length) throw new Error(`Missing books: ${missing.join(", ")}`);

  const meta: VersionMeta = {
    id,
    abbreviation: config.abbreviation,
    name: config.name,
    language: config.language,
    copyright: config.copyright,
    source: srcFlag >= 0 ? "local USFM" : config.url,
    importedAt: new Date().toISOString().slice(0, 10),
  };
  writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

  if (cleanup) rmSync(cleanup, { recursive: true, force: true });
  console.log(`Imported ${config.abbreviation}: ${seen.size} books, ${verseCount} verses, ${warningCount} warnings → ${outDir}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
