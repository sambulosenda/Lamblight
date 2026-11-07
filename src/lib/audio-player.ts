import { useSyncExternalStore } from "react";
import type { AudioTrack } from "./audio-types";

/**
 * The one audio player for the whole site. It lives outside React so playback carries
 * on across page navigations; the mini player in the root layout and the Listen buttons
 * on chapter pages both read this store.
 */
export interface PlayerState {
  track: AudioTrack | null;
  /** The chapter to play when this one ends. */
  next: AudioTrack | null;
  playing: boolean;
  loading: boolean;
  time: number;
  duration: number;
  rate: number;
  error: boolean;
}

export const RATES = [1, 1.25, 1.5, 2, 0.75];
const RATE_KEY = "lamplight:audio-rate";
const POS_KEY = "lamplight:audio-pos";

const INITIAL: PlayerState = { track: null, next: null, playing: false, loading: false, time: 0, duration: 0, rate: 1, error: false };
let state: PlayerState = INITIAL;
let audio: HTMLAudioElement | null = null;
const listeners = new Set<() => void>();
const endedListeners = new Set<(finished: AudioTrack, next: AudioTrack | null) => void>();

function set(patch: Partial<PlayerState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
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
  audio.addEventListener("play", () => set({ playing: true, error: false }));
  audio.addEventListener("pause", () => {
    set({ playing: false });
    savePosition();
  });
  audio.addEventListener("waiting", () => set({ loading: true }));
  audio.addEventListener("playing", () => set({ loading: false }));
  audio.addEventListener("loadedmetadata", () => set({ duration: audio!.duration }));
  audio.addEventListener("timeupdate", () => {
    set({ time: audio!.currentTime });
    if (Date.now() - lastSave > 5000) {
      lastSave = Date.now();
      savePosition();
    }
  });
  audio.addEventListener("error", () => set({ playing: false, loading: false, error: true }));
  audio.addEventListener("ended", () => {
    const finished = state.track!;
    const next = state.next;
    try {
      localStorage.removeItem(POS_KEY);
    } catch {}
    if (next) playTrack(next, null);
    else set({ playing: false });
    endedListeners.forEach((l) => l(finished, next));
  });
  return audio;
}

export function playTrack(track: AudioTrack, next: AudioTrack | null) {
  const a = element();
  if (state.track?.key === track.key) {
    set({ next });
    void a.play().catch(() => set({ playing: false }));
    return;
  }
  savePosition();
  const rate = storedRate();
  set({ track, next, time: 0, duration: track.duration, loading: true, error: false, rate });
  a.src = track.url;
  a.playbackRate = rate;
  const resume = savedPosition(track.key);
  if (resume > 5 && resume < track.duration - 5) a.currentTime = resume;
  void a.play().catch(() => set({ playing: false, loading: false }));
  updateMediaSession(track);
}

export function togglePlay() {
  if (!audio || !state.track) return;
  if (audio.paused) void audio.play().catch(() => set({ playing: false }));
  else audio.pause();
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
  if (audio) {
    savePosition();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
  set({ ...INITIAL });
  if ("mediaSession" in navigator) navigator.mediaSession.metadata = null;
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
  ms.setActionHandler("nexttrack", () => (state.next ? playTrack(state.next, null) : undefined));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function usePlayer(): PlayerState {
  return useSyncExternalStore(subscribe, () => state, () => INITIAL);
}
