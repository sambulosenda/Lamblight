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
 * "Pick up where you left off", from the chapter the reader last opened on this
 * device. First-time visitors get a gentle starting point instead.
 */
export function ContinueReading({ fallback }: { fallback: LastRead }) {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const last = parse(raw);
  const target = last ?? fallback;
  return (
    <section aria-labelledby="cont" className="card">
      <h2 id="cont">{last ? "Pick up where you left off" : "Not sure where to start?"}</h2>
      <p className="big">{target.label}</p>
      <p className="muted">{last ? "The last chapter you opened on this device." : "John’s Gospel is a good first read: short chapters, the life of Jesus."}</p>
      <Link href={target.href} className="more">
        {last ? "Continue reading" : `Start ${target.label}`} →
      </Link>
    </section>
  );
}
