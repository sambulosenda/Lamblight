import { useSyncExternalStore } from "react";
import { BOOKS, bookIndex, chapterName } from "./books";
import { chapterPath } from "./site";
import type { AudioTrack } from "./audio-types";

/**
 * The one audio player for the whole site. It lives outside React so playback carries
 * on across page navigations; the mini player in the root layout and the Listen buttons
 * on chapter pages both read this store.
 *
 * status:
 *   idle     no track (the player is closed)
 *   loading  asked to play, waiting for audio
 *   playing  audio is coming out
 *   paused   stopped by the reader, or the browser refused to start
 *   error    the recording could not be loaded; Play tries again
 */
export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

export interface PlayerState {
  status: PlayerStatus;
  track: AudioTrack | null;
  /** The chapter to play when this one ends. */
  next: AudioTrack | null;
  time: number;
  duration: number;
  rate: number;
}

/** Playing, or about to: the Listen and play buttons offer Pause. */
export const isActive = (s: PlayerState) => s.status === "loading" || s.status === "playing";

export const RATES = [1, 1.25, 1.5, 2, 0.75];
const RATE_KEY = "lamplight:audio-rate";
const POS_KEY = "lamplight:audio-pos";

const INITIAL: PlayerState = { status: "idle", track: null, next: null, time: 0, duration: 0, rate: 1 };
let state: PlayerState = INITIAL;
let audio: HTMLAudioElement | null = null;
const listeners = new Set<() => void>();
const endedListeners = new Set<(finished: AudioTrack, next: AudioTrack | null) => void>();

function set(patch: Partial<PlayerState>) {
  state = { ...state, ...patch };
  if (state.track && "mediaSession" in navigator) navigator.mediaSession.playbackState = isActive(state) ? "playing" : "paused";
  listeners.forEach((l) => l());
}

/** Element events only count while a track is loaded; closing the player fires a late pause. */
function setStatus(status: PlayerStatus) {
  if (state.track && state.status !== status) set({ status });
}

/**
 * The chapter after this one, in the same recording. Used when a chapter ends while the
 * reader is on another page, so no chapter page is there to say what comes next. Its
 * length is unknown until it loads; if it was never uploaded, the player shows an error.
 */
export function followingTrack(track: AudioTrack): AudioTrack | null {
  const [code, ch] = track.key.split(".");
  const i = bookIndex(code);
  if (i < 0) return null;
  const book = Number(ch) < BOOKS[i].chapters ? BOOKS[i] : BOOKS[i + 1];
  if (!book) return null;
  const chapter = book === BOOKS[i] ? Number(ch) + 1 : 1;
  const version = track.href.split("/")[1];
  return {
    key: `${book.code}.${chapter}`,
    title: `${chapterName(book)} ${chapter}`,
    url: track.url.replace(/\/[1-3A-Z]{3}\/\d+\.mp3$/, `/${book.code}/${chapter}.mp3`),
    href: chapterPath(version, book.slug, chapter),
    duration: 0,
  };
}

function storedRate(): number {
  try {
    const r = Number(localStorage.getItem(RATE_KEY));
    return RATES.includes(r) ? r : 1;
  } catch {
    return 1;
  }
}

/** Where the reader stopped in a chapter, so reopening it carries on. */
function savePosition() {
  if (!state.track || !audio) return;
  try {
    localStorage.setItem(POS_KEY, JSON.stringify({ key: state.track.key, time: Math.floor(audio.currentTime) }));
  } catch {}
}

function savedPosition(key: string): number {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) ?? "null") as { key?: string; time?: number } | null;
    return p?.key === key && typeof p.time === "number" ? p.time : 0;
  } catch {
    return 0;
  }
}

let lastSave = 0;

function element(): HTMLAudioElement {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = "none";
  audio.addEventListener("play", () => setStatus("loading"));
  audio.addEventListener("waiting", () => setStatus("loading"));
  audio.addEventListener("playing", () => setStatus("playing"));
  audio.addEventListener("pause", () => {
    if (state.status === "error") return;
    setStatus("paused");
    savePosition();
  });
  audio.addEventListener("loadedmetadata", () => state.track && set({ duration: audio!.duration }));
  audio.addEventListener("timeupdate", () => {
    if (!state.track) return;
    set({ time: audio!.currentTime });
    if (Date.now() - lastSave > 5000) {
      lastSave = Date.now();
      savePosition();
    }
  });
  audio.addEventListener("error", () => {
    if (audio!.getAttribute("src")) setStatus("error");
  });
  audio.addEventListener("ended", () => {
    const finished = state.track;
    if (!finished) return;
    const next = state.next;
    try {
      localStorage.removeItem(POS_KEY);
    } catch {}
    if (next) playTrack(next, followingTrack(next));
    else setStatus("paused");
    endedListeners.forEach((l) => l(finished, next));
  });
  return audio;
}

/** Start (or restart after an error) whatever track is loaded. */
function start(a: HTMLAudioElement) {
  if (state.status === "error") {
    a.load();
    set({ status: "loading" });
  }
  void a.play().catch(() => {
    if (state.status !== "error") setStatus("paused");
  });
}

export function playTrack(track: AudioTrack, next: AudioTrack | null) {
  const a = element();
  if (state.track?.key === track.key) {
    set({ next });
    start(a);
    return;
  }
  savePosition();
  const rate = storedRate();
  set({ status: "loading", track, next, time: 0, duration: track.duration, rate });
  a.src = track.url;
  a.playbackRate = rate;
  const resume = savedPosition(track.key);
  if (resume > 5 && resume < track.duration - 5) a.currentTime = resume;
  start(a);
  updateMediaSession(track);
}

export function togglePlay() {
  if (!audio || !state.track) return;
  if (isActive(state)) audio.pause();
  else start(audio);
}

export function seek(time: number) {
  if (!audio || !state.track) return;
  audio.currentTime = Math.max(0, Math.min(time, (audio.duration || state.duration) - 0.5));
  set({ time: audio.currentTime });
}

export function skip(seconds: number) {
  if (audio) seek(audio.currentTime + seconds);
}

export function cycleRate() {
  const rate = RATES[(RATES.indexOf(state.rate) + 1) % RATES.length];
  if (audio) audio.playbackRate = rate;
  try {
    localStorage.setItem(RATE_KEY, String(rate));
  } catch {}
  set({ rate });
}

/** Called by a chapter page that is showing the current track, so playback can run on. */
export function setNext(key: string, next: AudioTrack | null) {
  if (state.track?.key === key && state.next?.key !== next?.key) set({ next });
}

export function closePlayer() {
  savePosition();
  set({ ...INITIAL });
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
  }
}

/** Runs when a chapter finishes, with the chapter that starts next (if any). */
export function onTrackEnded(listener: (finished: AudioTrack, next: AudioTrack | null) => void) {
  endedListeners.add(listener);
  return () => {
    endedListeners.delete(listener);
  };
}

function updateMediaSession(track: AudioTrack) {
  if (!("mediaSession" in navigator)) return;
  const ms = navigator.mediaSession;
  ms.metadata = new MediaMetadata({ title: track.title, artist: "World English Bible", album: "Lamplight" });
  ms.setActionHandler("play", () => togglePlay());
  ms.setActionHandler("pause", () => togglePlay());
  ms.setActionHandler("seekbackward", () => skip(-15));
  ms.setActionHandler("seekforward", () => skip(15));
  ms.setActionHandler("seekto", (d) => (d.seekTime !== undefined ? seek(d.seekTime) : undefined));
  ms.setActionHandler("nexttrack", () => (state.next ? playTrack(state.next, followingTrack(state.next)) : undefined));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function usePlayer(): PlayerState {
  return useSyncExternalStore(subscribe, () => state, () => INITIAL);
}
