import { useSyncExternalStore } from "react";
import { bookByCode, chapterName } from "./books";

/**
 * Highlights and notes, kept in this browser only (localStorage). Nothing is
 * sent anywhere: there are no accounts yet, and notes stay private.
 *
 * Marks are keyed by canonical verse ID ("JHN.3.16"), so a highlight made in
 * the BSB also shows in the WEB and KJV.
 */
export type Colour = "yellow" | "green" | "blue" | "pink";
export const COLOURS: Colour[] = ["yellow", "green", "blue", "pink"];
export const DEFAULT_COLOUR_NAMES: Record<Colour, string> = {
  yellow: "Promises",
  green: "Commands",
  blue: "Prayer",
  pink: "Questions",
};
export const COLOUR_LABEL: Record<Colour, string> = { yellow: "Yellow", green: "Green", blue: "Blue", pink: "Pink" };

export interface Mark {
  colour?: Colour;
  note?: string;
  tags?: string[];
  /** The verse as it read when it was marked, so My notes can show it without loading the Bible. */
  text: string;
  /** Version id the verse was marked in, e.g. "bsb". */
  version: string;
  created: number;
  updated: number;
}

export type Marks = Record<string, Mark>;

const MARKS_KEY = "lamplight:marks";
const NAMES_KEY = "lamplight:colours";
const LEGACY_NOTE_PREFIX = "lamplight:note:";
const EVENT = "lamplight:marks";

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

const EMPTY: Marks = {};
let cachedRaw: string | null = null;
let cachedMarks: Marks = EMPTY;

function parseMarks(raw: string | null): Marks {
  if (raw === cachedRaw) return cachedMarks;
  cachedRaw = raw;
  try {
    const v = raw ? JSON.parse(raw) : null;
    cachedMarks = v && typeof v === "object" && !Array.isArray(v) ? (v as Marks) : EMPTY;
  } catch {
    cachedMarks = EMPTY;
  }
  return cachedMarks;
}

export function readMarks(): Marks {
  return parseMarks(readRaw(MARKS_KEY));
}

function writeMarks(marks: Marks): boolean {
  try {
    localStorage.setItem(MARKS_KEY, JSON.stringify(marks));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}

/** All marks on this device. Empty during server rendering and before hydration. */
export function useMarks(): Marks {
  return useSyncExternalStore(subscribe, readMarks, () => EMPTY);
}

/** True once the page is running in the browser, so stored marks can be trusted. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

const isEmpty = (m: Partial<Mark>) => !m.colour && !m.note?.trim() && !m.tags?.length;

/**
 * Change one verse's mark. Pass the fields to change; a mark with no colour,
 * note or tags left is removed. Returns false if this browser blocks storage.
 */
export function updateMark(id: string, base: { text: string; version: string }, patch: Partial<Omit<Mark, "text" | "version" | "created" | "updated">>): boolean {
  const marks = { ...readMarks() };
  const now = Date.now();
  const prev = marks[id];
  const next: Mark = { ...(prev ?? { created: now }), text: prev?.text || base.text, version: prev?.version || base.version, ...patch, updated: now };
  if (patch.colour === undefined && "colour" in patch) delete next.colour;
  if (isEmpty(next)) delete marks[id];
  else marks[id] = next;
  return writeMarks(marks);
}

export function removeMark(id: string): boolean {
  const marks = { ...readMarks() };
  delete marks[id];
  return writeMarks(marks);
}

/* ---------- Colour names ---------- */

let cachedNamesRaw: string | null = null;
let cachedNames: Record<Colour, string> = DEFAULT_COLOUR_NAMES;

function readNames(): Record<Colour, string> {
  const raw = readRaw(NAMES_KEY);
  if (raw === cachedNamesRaw) return cachedNames;
  cachedNamesRaw = raw;
  try {
    const v = raw ? (JSON.parse(raw) as Partial<Record<Colour, string>>) : {};
    cachedNames = { ...DEFAULT_COLOUR_NAMES };
    for (const c of COLOURS) if (typeof v[c] === "string" && v[c]!.trim()) cachedNames[c] = v[c]!.trim();
  } catch {
    cachedNames = DEFAULT_COLOUR_NAMES;
  }
  return cachedNames;
}

/** What each highlight colour means to this reader ("Yellow means Promises"). */
export function useColourNames(): Record<Colour, string> {
  return useSyncExternalStore(subscribe, readNames, () => DEFAULT_COLOUR_NAMES);
}

export function saveColourNames(names: Record<Colour, string>): boolean {
  try {
    localStorage.setItem(NAMES_KEY, JSON.stringify(names));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}

/* ---------- References ---------- */

export interface VerseKey {
  code: string;
  chapter: number;
  verse: number;
}

export function parseVerseId(id: string): VerseKey | null {
  const m = id.match(/^([1-3A-Z]{3})\.(\d+)\.(\d+)$/);
  return m ? { code: m[1], chapter: Number(m[2]), verse: Number(m[3]) } : null;
}

/** "John 3:16" */
export function verseLabel(id: string): string {
  const k = parseVerseId(id);
  const book = k ? bookByCode(k.code) : undefined;
  return k && book ? `${chapterName(book)} ${k.chapter}:${k.verse}` : id;
}

/** The verse in its chapter, e.g. /bsb/john/3#JHN.3.16 */
export function verseHref(id: string, version: string): string {
  const k = parseVerseId(id);
  const book = k ? bookByCode(k.code) : undefined;
  return k && book ? `/${version}/${book.slug}/${k.chapter}#${id}` : "/";
}

/**
 * Study notes used to be stored one key per verse. Fold any that are left into
 * the marks store, keeping a newer note if one is already there.
 */
export function migrateLegacyNotes(textFor?: (id: string) => string | undefined): void {
  let keys: string[] = [];
  try {
    keys = Object.keys(localStorage).filter((k) => k.startsWith(LEGACY_NOTE_PREFIX));
  } catch {
    return;
  }
  if (!keys.length) return;
  const marks = { ...readMarks() };
  const now = Date.now();
  for (const key of keys) {
    const id = key.slice(LEGACY_NOTE_PREFIX.length);
    const note = readRaw(key) ?? "";
    if (parseVerseId(id) && note.trim() && !marks[id]?.note) {
      marks[id] = { ...(marks[id] ?? { text: textFor?.(id) ?? "", version: "bsb", created: now }), note, updated: now };
    }
  }
  if (writeMarks(marks)) {
    for (const key of keys) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  }
}
