import { useSyncExternalStore } from "react";
import { PLANS, planBySlug, type Plan } from "./plans";

/**
 * Reading plan progress, kept in this browser only (localStorage), like highlights.
 * Plans are self-paced: today's reading is the first day with a chapter not yet read,
 * however long ago the plan was started.
 */
export interface PlanProgress {
  started: number;
  /** Chapters read, keyed "JHN.3". */
  done: string[];
}

export type AllProgress = Record<string, PlanProgress>;

const KEY = "lamplight:plans";
const EVENT = "lamplight:plans";
const EMPTY: AllProgress = {};

let cachedRaw: string | null = null;
let cached: AllProgress = EMPTY;

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Parse stored progress, dropping anything malformed or for a plan that no longer exists. */
export function parseProgress(raw: string | null): AllProgress {
  if (!raw) return EMPTY;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object" || Array.isArray(v)) return EMPTY;
    const out: AllProgress = {};
    for (const [slug, p] of Object.entries(v as Record<string, Partial<PlanProgress>>)) {
      if (!planBySlug(slug) || typeof p?.started !== "number" || !Array.isArray(p.done)) continue;
      out[slug] = { started: p.started, done: p.done.filter((k): k is string => typeof k === "string") };
    }
    return out;
  } catch {
    return EMPTY;
  }
}

export function readProgress(): AllProgress {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parseProgress(raw);
  }
  return cached;
}

function write(all: AllProgress): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
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

/** Progress for every plan this browser has started. Empty on the server and before hydration. */
export function usePlanProgress(): AllProgress {
  return useSyncExternalStore(subscribe, readProgress, () => EMPTY);
}

export function startPlan(slug: string): boolean {
  if (!planBySlug(slug)) return false;
  return write({ ...readProgress(), [slug]: { started: Date.now(), done: [] } });
}

export function stopPlan(slug: string): boolean {
  const all = { ...readProgress() };
  delete all[slug];
  return write(all);
}

/** Tick or untick one chapter in one plan. */
export function setChapterRead(slug: string, chapter: string, read: boolean): boolean {
  const all = readProgress();
  const p = all[slug];
  if (!p) return false;
  const done = new Set(p.done);
  if (read) done.add(chapter);
  else done.delete(chapter);
  return write({ ...all, [slug]: { ...p, done: [...done] } });
}

/** Tick a chapter in every started plan that includes it. */
export function markChapterRead(chapter: string): boolean {
  const all = readProgress();
  const next: AllProgress = { ...all };
  let changed = false;
  for (const [slug, p] of Object.entries(all)) {
    if (p.done.includes(chapter) || !planBySlug(slug)!.days.some((d) => d.includes(chapter))) continue;
    next[slug] = { ...p, done: [...p.done, chapter] };
    changed = true;
  }
  return changed ? write(next) : true;
}

export interface PlanStatus {
  plan: Plan;
  progress: PlanProgress;
  /** Index of today's reading: the first day not finished. Equals days.length when the plan is done. */
  day: number;
  chaptersDone: number;
  chaptersTotal: number;
  finished: boolean;
}

export function planStatus(plan: Plan, progress: PlanProgress): PlanStatus {
  const done = new Set(progress.done);
  const day = plan.days.findIndex((d) => d.some((k) => !done.has(k)));
  const chaptersTotal = plan.days.reduce((n, d) => n + d.length, 0);
  const chaptersDone = plan.days.reduce((n, d) => n + d.filter((k) => done.has(k)).length, 0);
  return { plan, progress, day: day < 0 ? plan.days.length : day, chaptersDone, chaptersTotal, finished: day < 0 };
}

/** Started plans, most recently started first. */
export function activePlans(all: AllProgress): PlanStatus[] {
  return PLANS.filter((p) => all[p.slug])
    .map((p) => planStatus(p, all[p.slug]))
    .sort((a, b) => b.progress.started - a.progress.started);
}
