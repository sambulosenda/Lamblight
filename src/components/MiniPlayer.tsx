"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { closePlayer, cycleRate, onTrackEnded, seek, skip, togglePlay, usePlayer } from "@/lib/audio-player";
import { CloseIcon, PauseIcon, PlayIcon, SkipIcon } from "./Icons";

const clock = (s: number) => {
  const t = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/**
 * The player bar along the bottom of every page while a chapter is playing. It sits in
 * the root layout, so it survives navigation. When a chapter ends and the next starts,
 * a reader who was on the finished chapter's page is taken to the next one.
 */
export function MiniPlayer() {
  const p = usePlayer();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(
    () =>
      onTrackEnded((finished, next) => {
        if (next && window.location.pathname === finished.href) router.push(next.href);
      }),
    [router],
  );

  if (!p.track) return null;
  const duration = p.duration || p.track.duration;
  const onPage = pathname === p.track.href;

  return (
    <div className="mini-player" role="region" aria-label="Audio player">
      <div className="mini-player__inner">
        <div className="mini-player__title">
          {onPage ? <span>{p.track.title}</span> : <Link href={p.track.href}>{p.track.title}</Link>}
          <span className="mini-player__sub">{p.error ? "Could not load the recording." : "World English Bible · read by Winfred W. Henson"}</span>
        </div>
        <div className="mini-player__controls">
          <button type="button" className="icon-btn" onClick={() => skip(-15)} aria-label="Back 15 seconds">
            <SkipIcon direction="back" />
          </button>
          <button type="button" className="icon-btn mini-player__play" onClick={togglePlay} aria-label={p.playing ? "Pause" : "Play"}>
            {p.playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
          </button>
          <button type="button" className="icon-btn" onClick={() => skip(15)} aria-label="Forward 15 seconds">
            <SkipIcon direction="forward" />
          </button>
        </div>
        <div className="mini-player__scrub">
          <span className="mini-player__time">{clock(p.time)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(duration))}
            step={1}
            value={Math.floor(p.time)}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Position"
            aria-valuetext={`${clock(p.time)} of ${clock(duration)}`}
          />
          <span className="mini-player__time">{clock(duration)}</span>
        </div>
        <button type="button" className="mini-player__rate" onClick={cycleRate} aria-label={`Playback speed ${p.rate}×. Change speed`}>
          {p.rate}×
        </button>
        <button type="button" className="icon-btn" onClick={closePlayer} aria-label="Close player">
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
