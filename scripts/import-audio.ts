/**
 * Mirror the World English Bible audio (Winfred W. Henson, public domain) from ebible.org
 * to our Cloudflare R2 bucket, one MP3 per chapter, and record what is there in
 * data/audio/web.json. The site only offers audio for chapters listed in that file.
 *
 *   npm run import:audio -- --bucket lamplight-audio                 # everything
 *   npm run import:audio -- --bucket lamplight-audio --books JHN,PSA # some books
 *   npm run import:audio -- --dry-run --books JHN                    # download and encode only
 *   npm run import:audio -- --check                                  # only check every book's file count
 *
 * Needs ffmpeg/ffprobe, and wrangler logged in to the Cloudflare account (`wrangler login`).
 * Each chapter is re-encoded to 64 kbps mono (the source is 128 kbps mono speech), which
 * halves the size. Objects are stored as web/<BOOK>/<chapter>.mp3. The manifest is written
 * after every chapter, so an interrupted run picks up where it stopped.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { BOOKS } from "../src/lib/books";
import type { AudioManifest } from "../src/lib/audio-types";

const SOURCE = "https://ebible.org/eng-web/audio/";
const VERSION = "web";
const BITRATE = "64k";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dryRun = args.includes("--dry-run");
const check = args.includes("--check");
const bucket = flag("--bucket");
if (!dryRun && !check && !bucket) throw new Error("Pass --bucket <name>, or --dry-run to download and encode without uploading.");
const only = flag("--books")?.toUpperCase().split(",");
const cache = path.resolve(flag("--cache") ?? path.join(tmpdir(), "lamplight-audio"));
mkdirSync(cache, { recursive: true });

const manifestPath = path.join("data", "audio", `${VERSION}.json`);
mkdirSync(path.dirname(manifestPath), { recursive: true });
const manifest: AudioManifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : {
      version: VERSION,
      narrator: "Winfred W. Henson",
      source: SOURCE,
      licence: "Public domain",
      bitrate: BITRATE,
      chapters: {},
    };

const save = () => {
  const sorted = Object.fromEntries(
    Object.entries(manifest.chapters).sort(([a], [b]) => {
      const [ca, na] = a.split(".");
      const [cb, nb] = b.split(".");
      return BOOKS.findIndex((x) => x.code === ca) - BOOKS.findIndex((x) => x.code === cb) || Number(na) - Number(nb);
    }),
  );
  writeFileSync(manifestPath, JSON.stringify({ ...manifest, chapters: sorted }, null, 1) + "\n");
};

async function listing(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return [...(await res.text()).matchAll(/href="([^"?#]+)"/g)].map((m) => m[1]).filter((h) => !h.startsWith("http") && !h.startsWith("../"));
}

const run = (cmd: string, argv: string[]) => execFileSync(cmd, argv, { stdio: ["ignore", "pipe", "pipe"] }).toString();

async function main() {
  // The index lists the 66 book folders in canonical order: 01_Genesis/ ... 66_Revelation/.
  const folders = (await listing(SOURCE)).filter((h) => /^\d\d_.+\/$/.test(h)).sort();
  if (folders.length !== BOOKS.length) throw new Error(`Expected ${BOOKS.length} book folders, found ${folders.length}`);

  for (const [i, book] of BOOKS.entries()) {
    if (only && !only.includes(book.code)) continue;
    // Files are "0997 John-Chapter One.mp3": a running number, so sorting gives chapter order.
    // Skip duplicate copies such as "0549 Psalms-Seventy One (1).mp3".
    const files = (await listing(SOURCE + folders[i])).filter((h) => /\.mp3$/i.test(h) && !/%28\d+%29\.mp3$/i.test(h)).sort();
    if (files.length !== book.chapters) throw new Error(`${book.code}: expected ${book.chapters} chapters, found ${files.length} files in ${folders[i]}`);
    if (check) {
      console.log(`ok ${book.code} ${files.length}`);
      continue;
    }

    for (const [c, file] of files.entries()) {
      const chapter = c + 1;
      const key = `${book.code}.${chapter}`;
      if (manifest.chapters[key] && !dryRun) continue;

      const src = path.join(cache, `${key}.src.mp3`);
      const out = path.join(cache, `${key}.mp3`);
      if (!existsSync(src)) {
        const res = await fetch(SOURCE + folders[i] + file);
        if (!res.ok) throw new Error(`${key}: HTTP ${res.status} for ${file}`);
        writeFileSync(src, Buffer.from(await res.arrayBuffer()));
      }
      run("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-ac", "1", "-b:a", BITRATE, "-map_metadata", "-1", "-id3v2_version", "3", "-metadata", `title=${book.name} ${chapter}`, "-metadata", "artist=Winfred W. Henson", "-metadata", "album=World English Bible", out]);
      const duration = Math.round(Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).trim()) * 10) / 10;
      const bytes = statSync(out).size;

      if (!dryRun) {
        run("wrangler", ["r2", "object", "put", `${bucket}/${VERSION}/${book.code}/${chapter}.mp3`, "--file", out, "--content-type", "audio/mpeg", "--cache-control", "public, max-age=31536000, immutable", "--remote"]);
        manifest.chapters[key] = { duration, bytes };
        save();
      }
      console.log(`${dryRun ? "encoded" : "uploaded"} ${key} ${duration}s ${(bytes / 1e6).toFixed(1)} MB`);
    }
  }
  console.log(`${Object.keys(manifest.chapters).length} chapters in ${manifestPath}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
