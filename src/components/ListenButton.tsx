"use client";

import { useEffect } from "react";
import type { AudioTrack } from "@/lib/audio-types";
import { isActive, playTrack, setNext, togglePlay, usePlayer } from "@/lib/audio-player";
import { HeadphonesIcon, PauseIcon } from "./Icons";

const minutes = (s: number) => Math.max(1, Math.round(s / 60));

/** "Listen" in the reader bar: plays this chapter, then runs on into the next. */
export function ListenButton({ track, next }: { track: AudioTrack; next: AudioTrack | null }) {
  const player = usePlayer();
  const current = player.track?.key === track.key;
  const active = current && isActive(player);

  // Following along: when the player has moved on to this chapter, tell it what comes after.
  useEffect(() => {
    setNext(track.key, next);
  }, [track.key, next, player.track?.key]);

  return (
    <button
      type="button"
      className="btn btn--quiet listen-btn"
      aria-pressed={active}
      onClick={() => (current ? togglePlay() : playTrack(track, next))}
      title={`Listen to ${track.title}, about ${minutes(track.duration)} min`}
    >
      {active ? <PauseIcon size={14} /> : <HeadphonesIcon />}
      <span>{active ? "Pause" : "Listen"}</span>
    </button>
  );
}
