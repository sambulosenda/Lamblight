/**
 * Canonical book list, shared by the importer, the web app and (later) the Expo app.
 * `code` is the USFM/OSIS-style book code used in canonical verse IDs (JHN.3.16).
 * `slug` is the URL segment (/bsb/john/3/16).
 * `aliases` feed the reference parser; they are matched after lowercasing and
 * stripping spaces and dots, so "1 Cor", "1cor" and "1 Cor." all match "1cor".
 */
export type Testament = "OT" | "NT";

export interface Book {
  code: string;
  slug: string;
  name: string;
  /** Long title used above the chapter heading, e.g. "The Gospel of John". */
  title: string;
  testament: Testament;
  chapters: number;
  aliases: string[];
}

const b = (
  code: string,
  slug: string,
  name: string,
  title: string,
  testament: Testament,
  chapters: number,
  aliases: string[],
): Book => ({ code, slug, name, title, testament, chapters, aliases });

export const BOOKS: Book[] = [
  b("GEN", "genesis", "Genesis", "Genesis", "OT", 50, ["gen", "ge", "gn"]),
  b("EXO", "exodus", "Exodus", "Exodus", "OT", 40, ["exo", "ex", "exod"]),
  b("LEV", "leviticus", "Leviticus", "Leviticus", "OT", 27, ["lev", "le", "lv"]),
  b("NUM", "numbers", "Numbers", "Numbers", "OT", 36, ["num", "nu", "nm", "nb"]),
  b("DEU", "deuteronomy", "Deuteronomy", "Deuteronomy", "OT", 34, ["deut", "deu", "dt", "de"]),
  b("JOS", "joshua", "Joshua", "Joshua", "OT", 24, ["josh", "jos", "jsh"]),
  b("JDG", "judges", "Judges", "Judges", "OT", 21, ["judg", "jdg", "jg", "jdgs"]),
  b("RUT", "ruth", "Ruth", "Ruth", "OT", 4, ["rut", "ru", "rth"]),
  b("1SA", "1-samuel", "1 Samuel", "1 Samuel", "OT", 31, ["1sam", "1sa", "1sm", "1s", "isam", "firstsamuel"]),
  b("2SA", "2-samuel", "2 Samuel", "2 Samuel", "OT", 24, ["2sam", "2sa", "2sm", "2s", "iisam", "secondsamuel"]),
  b("1KI", "1-kings", "1 Kings", "1 Kings", "OT", 22, ["1kgs", "1ki", "1kin", "1k", "ikgs", "firstkings"]),
  b("2KI", "2-kings", "2 Kings", "2 Kings", "OT", 25, ["2kgs", "2ki", "2kin", "2k", "iikgs", "secondkings"]),
  b("1CH", "1-chronicles", "1 Chronicles", "1 Chronicles", "OT", 29, ["1chr", "1ch", "1chron", "firstchronicles"]),
  b("2CH", "2-chronicles", "2 Chronicles", "2 Chronicles", "OT", 36, ["2chr", "2ch", "2chron", "secondchronicles"]),
  b("EZR", "ezra", "Ezra", "Ezra", "OT", 10, ["ezr", "ezra"]),
  b("NEH", "nehemiah", "Nehemiah", "Nehemiah", "OT", 13, ["neh", "ne"]),
  b("EST", "esther", "Esther", "Esther", "OT", 10, ["est", "esth", "es"]),
  b("JOB", "job", "Job", "Job", "OT", 42, ["jb"]),
  b("PSA", "psalms", "Psalms", "Psalms", "OT", 150, ["ps", "psa", "psalm", "pss", "psm", "pslm"]),
  b("PRO", "proverbs", "Proverbs", "Proverbs", "OT", 31, ["prov", "pro", "prv", "pr", "proverb"]),
  b("ECC", "ecclesiastes", "Ecclesiastes", "Ecclesiastes", "OT", 12, ["eccl", "ecc", "ec", "eccles", "qoh"]),
  b("SNG", "song-of-songs", "Song of Songs", "Song of Songs", "OT", 8, ["song", "sng", "sos", "songofsolomon", "canticles", "ss"]),
  b("ISA", "isaiah", "Isaiah", "Isaiah", "OT", 66, ["isa", "is"]),
  b("JER", "jeremiah", "Jeremiah", "Jeremiah", "OT", 52, ["jer", "je", "jr"]),
  b("LAM", "lamentations", "Lamentations", "Lamentations", "OT", 5, ["lam", "la"]),
  b("EZK", "ezekiel", "Ezekiel", "Ezekiel", "OT", 48, ["ezek", "ezk", "eze"]),
  b("DAN", "daniel", "Daniel", "Daniel", "OT", 12, ["dan", "da", "dn"]),
  b("HOS", "hosea", "Hosea", "Hosea", "OT", 14, ["hos", "ho"]),
  b("JOL", "joel", "Joel", "Joel", "OT", 3, ["jol", "joe", "jl"]),
  b("AMO", "amos", "Amos", "Amos", "OT", 9, ["amo", "am"]),
  b("OBA", "obadiah", "Obadiah", "Obadiah", "OT", 1, ["obad", "oba", "ob"]),
  b("JON", "jonah", "Jonah", "Jonah", "OT", 4, ["jnh", "jon"]),
  b("MIC", "micah", "Micah", "Micah", "OT", 7, ["mic", "mc"]),
  b("NAM", "nahum", "Nahum", "Nahum", "OT", 3, ["nah", "nam", "na"]),
  b("HAB", "habakkuk", "Habakkuk", "Habakkuk", "OT", 3, ["hab", "hb"]),
  b("ZEP", "zephaniah", "Zephaniah", "Zephaniah", "OT", 3, ["zeph", "zep", "zp"]),
  b("HAG", "haggai", "Haggai", "Haggai", "OT", 2, ["hag", "hg"]),
  b("ZEC", "zechariah", "Zechariah", "Zechariah", "OT", 14, ["zech", "zec", "zc"]),
  b("MAL", "malachi", "Malachi", "Malachi", "OT", 4, ["mal", "ml"]),
  b("MAT", "matthew", "Matthew", "The Gospel of Matthew", "NT", 28, ["matt", "mat", "mt"]),
  b("MRK", "mark", "Mark", "The Gospel of Mark", "NT", 16, ["mrk", "mar", "mk", "mr"]),
  b("LUK", "luke", "Luke", "The Gospel of Luke", "NT", 24, ["luk", "lk"]),
  b("JHN", "john", "John", "The Gospel of John", "NT", 21, ["jhn", "jn", "joh"]),
  b("ACT", "acts", "Acts", "The Acts of the Apostles", "NT", 28, ["act", "ac"]),
  b("ROM", "romans", "Romans", "Romans", "NT", 16, ["rom", "ro", "rm"]),
  b("1CO", "1-corinthians", "1 Corinthians", "1 Corinthians", "NT", 16, ["1cor", "1co", "icor", "firstcorinthians"]),
  b("2CO", "2-corinthians", "2 Corinthians", "2 Corinthians", "NT", 13, ["2cor", "2co", "iicor", "secondcorinthians"]),
  b("GAL", "galatians", "Galatians", "Galatians", "NT", 6, ["gal", "ga"]),
  b("EPH", "ephesians", "Ephesians", "Ephesians", "NT", 6, ["eph", "ephes"]),
  b("PHP", "philippians", "Philippians", "Philippians", "NT", 4, ["phil", "php", "pp"]),
  b("COL", "colossians", "Colossians", "Colossians", "NT", 4, ["col", "co"]),
  b("1TH", "1-thessalonians", "1 Thessalonians", "1 Thessalonians", "NT", 5, ["1thess", "1th", "1thes", "ithess"]),
  b("2TH", "2-thessalonians", "2 Thessalonians", "2 Thessalonians", "NT", 3, ["2thess", "2th", "2thes", "iithess"]),
  b("1TI", "1-timothy", "1 Timothy", "1 Timothy", "NT", 6, ["1tim", "1ti", "itim"]),
  b("2TI", "2-timothy", "2 Timothy", "2 Timothy", "NT", 4, ["2tim", "2ti", "iitim"]),
  b("TIT", "titus", "Titus", "Titus", "NT", 3, ["tit", "ti"]),
  b("PHM", "philemon", "Philemon", "Philemon", "NT", 1, ["philem", "phm", "pm", "phlm"]),
  b("HEB", "hebrews", "Hebrews", "Hebrews", "NT", 13, ["heb"]),
  b("JAS", "james", "James", "James", "NT", 5, ["jas", "jm", "jam"]),
  b("1PE", "1-peter", "1 Peter", "1 Peter", "NT", 5, ["1pet", "1pe", "1pt", "1p", "ipet"]),
  b("2PE", "2-peter", "2 Peter", "2 Peter", "NT", 3, ["2pet", "2pe", "2pt", "2p", "iipet"]),
  b("1JN", "1-john", "1 John", "1 John", "NT", 5, ["1jn", "1jhn", "1john", "1jo", "ijohn"]),
  b("2JN", "2-john", "2 John", "2 John", "NT", 1, ["2jn", "2jhn", "2john", "2jo", "iijohn"]),
  b("3JN", "3-john", "3 John", "3 John", "NT", 1, ["3jn", "3jhn", "3john", "3jo", "iiijohn"]),
  b("JUD", "jude", "Jude", "Jude", "NT", 1, ["jud", "jd"]),
  b("REV", "revelation", "Revelation", "Revelation", "NT", 22, ["rev", "re", "rv", "revelations", "apocalypse"]),
];

const byCode = new Map(BOOKS.map((book) => [book.code, book]));
const bySlug = new Map(BOOKS.map((book) => [book.slug, book]));

export function bookByCode(code: string): Book | undefined {
  return byCode.get(code.toUpperCase());
}

export function bookBySlug(slug: string): Book | undefined {
  return bySlug.get(slug.toLowerCase());
}

/** Name used with a chapter number: "Psalm 23", but "Psalms" for the book. */
export function chapterName(book: Book): string {
  return book.code === "PSA" ? "Psalm" : book.name;
}

export function bookIndex(code: string): number {
  return BOOKS.findIndex((book) => book.code === code);
}
