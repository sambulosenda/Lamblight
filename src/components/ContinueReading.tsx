"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { activePlans, usePlanProgress } from "@/lib/plan-progress";
import { chapterLabel, dayLabel, parseChapterKey } from "@/lib/plans";
import { chapterPath } from "@/lib/site";
import { DEFAULT_VERSION } from "@/lib/versions";

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
 * A reader with a plan in progress gets today's reading instead; first-time
 * visitors get a starting point.
 */
const noop = () => () => {};

export function ContinueReading({ fallback }: { fallback: LastRead }) {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  // The saved chapter only exists in the browser. Until it can be read, show an
  // empty card of the same size rather than flashing the first-visit text.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const plans = usePlanProgress();
  if (!hydrated) return <div className="continue continue--pending" aria-hidden="true" />;
  const plan = activePlans(plans).find((s) => !s.finished);
  if (plan) {
    const day = plan.plan.days[plan.day];
    const nextKey = day.find((k) => !plan.progress.done.includes(k))!;
    const p = parseChapterKey(nextKey)!;
    return (
      <Link href={chapterPath(DEFAULT_VERSION, p.book.slug, p.chapter)} className="continue">
        <span className="continue__head">
          <span className="smallcaps">{plan.plan.name}</span>
          <span>
            Day {plan.day + 1} of {plan.plan.days.length}
          </span>
        </span>
        <span className="continue__body">
          <span className="continue__num" aria-hidden="true">
            {plan.day + 1}
          </span>
          <span className="continue__text">Today: {dayLabel(day).join(", ")}.</span>
        </span>
        <span className="continue__cta">Read {chapterLabel(nextKey)} →</span>
      </Link>
    );
  }
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
