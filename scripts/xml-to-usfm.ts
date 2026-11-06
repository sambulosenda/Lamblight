/**
 * Convert an eBible USFX or OSIS XML Bible into one USFM file per book, so it
 * can go through the normal importer:
 *
 *   npx tsx scripts/xml-to-usfm.ts eng-web.usfx.xml /tmp/web-usfm
 *   npm run import -- web --src /tmp/web-usfm
 *
 * Used because ebible.org (the importer's default source) is not reachable
 * from every build machine; github.com/seven1m/open-bibles mirrors eBible's
 * public-domain texts as USFX/OSIS.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { bookByCode } from "../src/lib/books";
import { OSIS } from "../src/lib/osis";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "’" };
const decode = (s: string) => s.replace(/&(\w+);/g, (m, e) => ENTITIES[e] ?? m).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const attr = (attrs: string, name: string) => attrs.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

interface Tag { close: boolean; name: string; attrs: string; empty: boolean }
type Token = string | Tag;

function* tokens(xml: string): Generator<Token> {
  const re = /<(\/?)([A-Za-z][\w:]*)([^>]*?)(\/?)>|<\?[^>]*\?>|<!--[\s\S]*?-->|([^<]+)/g;
  for (const m of xml.matchAll(re)) {
    if (m[5] !== undefined) yield decode(m[5]).replace(/\s+/g, " ");
    else if (m[2]) yield { close: m[1] === "/", name: m[2], attrs: m[3], empty: m[4] === "/" };
  }
}

/** USFX: eBible's XML form of USFM; most elements map one to one. */
function usfx(xml: string): Map<string, string> {
  const books = new Map<string, string>();
  let code = "";
  let out = "";
  let skip = 0; // inside an element whose text we drop
  const SKIP = new Set(["id", "h", "toc", "ide", "cl", "vp", "x", "rem", "periph", "languageCode"]);
  const CHAR: Record<string, string> = { wj: "wj", add: "add", nd: "nd", qs: "qs", it: "it", k: "k", bd: "bd", sc: "sc", fqa: "fqa", fq: "fq", fr: "fr", fl: "fl", ft: "ft" };
  const flush = () => { if (code) books.set(code, out); };
  for (const t of tokens(xml)) {
    if (typeof t === "string") { if (!skip && code) out += t; continue; }
    if (t.name === "book" && !t.close) { flush(); const c = attr(t.attrs, "id") ?? ""; code = bookByCode(c) ? c : ""; out = `\\id ${code}\n`; continue; }
    if (!code) continue;
    if (SKIP.has(t.name)) { if (!t.empty) skip += t.close ? -1 : 1; continue; }
    if (skip) continue;
    switch (t.name) {
      case "c": if (!t.close) out += `\n\\c ${attr(t.attrs, "id")}\n`; break;
      case "v": if (!t.close) out += ` \\v ${attr(t.attrs, "id")} `; break;
      case "ve": break;
      case "p": if (!t.close) out += `\n\\${attr(t.attrs, "sfm") || "p"} `; break;
      case "q": if (!t.close) out += `\n\\q${attr(t.attrs, "level") ?? "1"} `; break;
      case "d": if (!t.close) out += "\n\\d "; break;
      case "s": if (!t.close) out += `\n\\s${attr(t.attrs, "level") ?? "1"} `; break;
      case "b": out += "\n\\b\n"; break;
      case "f": out += t.close ? "\\f*" : "\\f + "; break;
      case "ref": case "xt": break; // keep the reference text only
      default:
        if (CHAR[t.name]) {
          const m = CHAR[t.name];
          if (["ft", "fr", "fq", "fqa", "fl"].includes(m)) { if (!t.close) out += `\\${m} `; }
          else out += t.close ? `\\${m}*` : `\\${m} `;
        }
    }
  }
  flush();
  return books;
}

/** eBible "modified OSIS" with milestoned chapters and verses. */
function osis(xml: string): Map<string, string> {
  const books = new Map<string, string>();
  let code = "";
  let out = "";
  let skip = 0;
  const flush = () => { if (code) books.set(code, out); };
  for (const t of tokens(xml)) {
    if (typeof t === "string") { if (!skip && code) out += t; continue; }
    if (t.name === "div" && !t.close && attr(t.attrs, "type") === "book") {
      flush();
      code = OSIS[attr(t.attrs, "osisID") ?? ""] ?? "";
      out = `\\id ${code}\n`;
      continue;
    }
    if (!code) continue;
    if (t.name === "title" || t.name === "note") {
      if (t.empty) continue;
      if (t.close) { if (skip) skip--; else out += "\n"; continue; }
      const type = attr(t.attrs, "type");
      if (t.name === "title" && type === "psalm") out += "\n\\d ";
      else if (t.name === "title" && type !== "main") out += "\n\\s1 ";
      else skip++;
      continue;
    }
    if (skip) continue;
    switch (t.name) {
      case "chapter": if (attr(t.attrs, "sID")) out += `\n\\c ${attr(t.attrs, "n")}\n`; break;
      case "verse": if (attr(t.attrs, "sID")) out += ` \\v ${attr(t.attrs, "n")} `; break;
      case "p": if (!t.close && !t.empty) out += "\n\\p "; break;
      case "l": if (!t.close && !t.empty) out += `\n\\q${attr(t.attrs, "level") ?? "1"} `; break;
      case "transChange": if (!t.empty) out += t.close ? "\\add*" : "\\add "; break;
      case "divineName": if (!t.empty) out += t.close ? "\\nd*" : "\\nd "; break;
      default: break; // lg, q (quotation milestones), w, etc.
    }
  }
  flush();
  return books;
}

const [input, outDir] = process.argv.slice(2);
if (!input || !outDir) throw new Error("Usage: tsx scripts/xml-to-usfm.ts <bible.usfx.xml|bible.osis.xml> <out-dir>");
const xml = readFileSync(input, "utf8");
const books = xml.includes("<osis") ? osis(xml) : usfx(xml);
mkdirSync(outDir, { recursive: true });
let i = 0;
/** Collapse the XML's layout whitespace: one space between words, none after a marker's own space. */
const tidy = (usfm: string) =>
  usfm
    .split("\n")
    .map((line) => line.replace(/ {2,}/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .replace(/(\\v \d+) +/g, "$1 ")
    .replace(/ +(\\f\*|\\add\*|\\wj\*|\\nd\*)/g, "$1");
for (const [code, text] of books) writeFileSync(path.join(outDir, `${String(++i).padStart(2, "0")}${code}.usfm`), tidy(text) + "\n");
console.log(`Wrote ${books.size} books to ${outDir}`);
