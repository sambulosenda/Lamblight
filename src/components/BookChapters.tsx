"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

const noop = () => () => {};
const read = (key: string) => () => {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};
const readLast = read("lamplight:last");
const readRead = read("lamplight:read");
const server = () => "";

function parse<T>(raw: string, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface Props {
  /** The book's URL, e.g. /bsb/john. Chapter links are `${base}/${n}`. */
  base: string;
  chapters: number;
  /** "John" or "Psalm": used in each chapter's accessible name. */
  chapterLabel: string;
}

/** Continue/start buttons and the ruled chapter grid, marked with what this reader has read. */
export function BookChapters({ base, chapters, chapterLabel }: Props) {
  const lastRaw = useSyncExternalStore(noop, readLast, server);
  const readRaw = useSyncExternalStore(noop, readRead, server);
  const current = useMemo(() => {
    const last = parse<{ href?: string }>(lastRaw, {});
    const m = last.href?.match(/\/(\d+)$/);
    return m && last.href === `${base}/${m[1]}` ? Number(m[1]) : 0;
  }, [lastRaw, base]);
  const done = useMemo(() => {
    const list = parse<unknown>(readRaw, []);
    return new Set(Array.isArray(list) ? list.filter((h): h is string => typeof h === "string") : []);
  }, [readRaw]);

  return (
    <div>
      <div className="book-start">
        {current ? (
          <Link href={`${base}/${current}`} className="btn btn--primary">
            Continue at chapter {current}
          </Link>
        ) : null}
        <Link href={`${base}/1`} className={current ? "btn" : "btn btn--primary"}>
          Start at chapter 1
        </Link>
      </div>
      <h2 className="smallcaps-head book-chapters-head">Chapters</h2>
      <ul className="chapters" aria-label="Chapters">
        {Array.from({ length: chapters }, (_, i) => i + 1).map((n) => {
          const href = `${base}/${n}`;
          const isRead = done.has(href);
          return (
            <li key={n}>
              <Link
                href={href}
                aria-label={`${chapterLabel} ${n}${n === current ? ", where you stopped" : isRead ? ", read" : ""}`}
                data-current={n === current || undefined}
                data-read={isRead || undefined}
              >
                {n}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
