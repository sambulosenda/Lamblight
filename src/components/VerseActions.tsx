"use client";
import { useState } from "react";
import { CopyIcon, ShareIcon } from "./Icons";

interface Props {
  text: string;
  reference: string;
  versionAbbr: string;
}

export function CopyVerseButton({ text, reference, versionAbbr }: Props) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`“${text}”\n${reference} ${versionAbbr}`);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {}
      }}
    >
      <CopyIcon />
      <span aria-live="polite">{done ? "Copied" : "Copy verse"}</span>
    </button>
  );
}

export function ShareVerseButton({ text, reference, versionAbbr, path }: Props & { path: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn"
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
