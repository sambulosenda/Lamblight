"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

interface LastRead {
  href: string;
  label: string;
}

const KEY = "lamplight:last";

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

function parse(raw: string | null): LastRead | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as LastRead;
    return typeof v?.href === "string" && v.href.startsWith("/") && typeof v.label === "string" ? v : null;
  } catch {
    return null;
  }
}

/**
 * "Continue reading", from the chapter the reader last opened on this device,
 * set like the top of a printed page: running head, then the chapter numeral.
 * First-time visitors get a starting point instead.
 */
const noop = () => () => {};

export function ContinueReading({ fallback }: { fallback: LastRead }) {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  // The saved chapter only exists in the browser. Until it can be read, show an
  // empty card of the same size rather than flashing the first-visit text.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  if (!hydrated) return <div className="continue continue--pending" aria-hidden="true" />;
  const last = parse(raw);
  const target = last ?? fallback;
  const m = target.label.match(/^(.*?)\s+(\d+)$/);
  const book = m ? m[1] : target.label;
  const chapter = m ? m[2] : "";
  return (
    <Link href={target.href} className="continue">
      <span className="continue__head">
        <span className="smallcaps">{book}</span>
        <span>{last ? "You stopped here" : "A good place to start"}</span>
      </span>
      <span className="continue__body">
        {chapter ? (
          <span className="continue__num" aria-hidden="true">
            {chapter}
          </span>
        ) : null}
        <span className="continue__text">
          {last ? `Pick up ${target.label} where you left off.` : `${target.label}: short chapters on the life of Jesus.`}
        </span>
      </span>
      <span className="continue__cta">{last ? "Continue reading" : `Start ${target.label}`} →</span>
    </Link>
  );
}
