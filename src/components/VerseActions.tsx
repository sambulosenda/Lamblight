"use client";
import { useState } from "react";
import { CopyIcon, ShareIcon } from "./Icons";

interface Props {
  text: string;
  reference: string;
  versionAbbr: string;
  /** Button styling; the verse page uses its own icon-row style. */
  className?: string;
  /** Shorter label, shown in the icon row on phones. */
  short?: boolean;
}

export function CopyVerseButton({ text, reference, versionAbbr, className = "btn btn--quiet", short = false }: Props) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`“${text}”\n${reference} ${versionAbbr}`);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {}
      }}
    >
      <CopyIcon />
      <span aria-live="polite">{done ? "Copied" : short ? "Copy" : "Copy verse"}</span>
    </button>
  );
}

export function ShareVerseButton({ text, reference, versionAbbr, path, className = "btn btn--quiet" }: Props & { path: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const url = `${location.origin}${path}`;
        try {
          if (navigator.share) {
            await navigator.share({ title: `${reference} ${versionAbbr}`, text: `“${text}” ${reference} ${versionAbbr}`, url });
          } else {
            await navigator.clipboard.writeText(url);
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          }
        } catch {}
      }}
    >
      <ShareIcon />
      <span aria-live="polite">{done ? "Link copied" : "Share"}</span>
    </button>
  );
}
