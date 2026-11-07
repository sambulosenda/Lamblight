import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife } from "next/cache";
import { chapterName, type Book } from "./books";
import { chapterPath } from "./site";
import type { AudioManifest, AudioTrack } from "./audio-types";

/**
 * Chapter audio. A chapter has audio when it is listed in data/audio/<version>.json
 * (scripts/import-audio.ts adds a chapter only after uploading it) and AUDIO_BASE_URL
 * points at the bucket's public URL. With either missing, the site offers no audio.
 */
const BASE = process.env.AUDIO_BASE_URL?.replace(/\/$/, "");

async function readManifest(version: string): Promise<AudioManifest | null> {
  "use cache";
  cacheLife("max");
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), "data", "audio", `${version}.json`), "utf8")) as AudioManifest;
  } catch {
    return null;
  }
}

export async function getAudioTrack(version: string, book: Book, chapter: number): Promise<AudioTrack | null> {
  if (!BASE) return null;
  const entry = (await readManifest(version))?.chapters[`${book.code}.${chapter}`];
  if (!entry) return null;
  return {
    key: `${book.code}.${chapter}`,
    title: `${chapterName(book)} ${chapter}`,
    url: `${BASE}/${version}/${book.code}/${chapter}.mp3`,
    href: chapterPath(version, book.slug, chapter),
    duration: entry.duration,
  };
}
