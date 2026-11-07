"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useHydrated } from "@/lib/marks";
import { activePlans, markChapterRead, setChapterRead, usePlanProgress } from "@/lib/plan-progress";
import { chapterLabel, parseChapterKey } from "@/lib/plans";
import { chapterPath } from "@/lib/site";

/**
 * At the end of a chapter that belongs to a plan the reader has started: mark it read,
 * then go on to the plan's next unread chapter. Shows nothing for anyone else.
 *
 * Reaching this bar by scrolling marks the chapter read on its own, because continuous
 * scroll can carry the reader into the next chapter before they think to tap the button.
 * "Undo" is there for a chapter that was only skimmed.
 */
export function PlanChapterBar({ chapterKey, version }: { chapterKey: string; version: string }) {
  const all = usePlanProgress();
  const hydrated = useHydrated();
  const ref = useRef<HTMLElement>(null);
  const inPlan = hydrated && activePlans(all).some((s) => s.plan.days.some((d) => d.includes(chapterKey)));

  useEffect(() => {
    const el = ref.current;
    if (!inPlan || !el || !("IntersectionObserver" in window)) return;
    const startY = window.scrollY;
    const io = new IntersectionObserver(([entry]) => {
      // Only when the reader has scrolled here themselves, not on a short page that starts at the bottom.
      if (!entry.isIntersecting || window.scrollY - startY < 200) return;
      io.disconnect();
      markChapterRead(chapterKey);
    });
    io.observe(el);
    // Disconnects after the first mark, so an Undo is not re-marked during the same visit.
    return () => io.disconnect();
  }, [inPlan, chapterKey]);

  if (!hydrated) return null;
  const plans = activePlans(all).filter((s) => !s.finished || s.progress.done.includes(chapterKey));
  const here = plans.filter((s) => s.plan.days.some((d) => d.includes(chapterKey)));
  if (!here.length) return null;

  const read = here.every((s) => s.progress.done.includes(chapterKey));
  const first = here[0];
  const dayIndex = first.plan.days.findIndex((d) => d.includes(chapterKey));
  // After this one: the first unread chapter in plan order (this chapter counts as read).
  const done = new Set([...first.progress.done, chapterKey]);
  const next = first.plan.days.flat().find((k) => !done.has(k));
  const nextParts = next ? parseChapterKey(next) : null;
  const nextHref = nextParts ? chapterPath(version, nextParts.book.slug, nextParts.chapter) : null;
  // An unread chapter earlier in the plan comes first: that is catching up, not moving on.
  const order = first.plan.days.flat();
  const behind = next ? order.indexOf(next) < order.indexOf(chapterKey) : false;

  return (
    <section ref={ref} className="plan-bar" aria-label="Reading plan">
      <p className="plan-bar__plan">
        <Link href={`/plans/${first.plan.slug}`}>{first.plan.name}</Link>
        <span>
          Day {dayIndex + 1} of {first.plan.days.length}
          {here.length > 1 ? ` · and ${here.length - 1} more ${here.length === 2 ? "plan" : "plans"}` : ""}
        </span>
      </p>
      <div className="plan-bar__actions">
        {read ? (
          <button type="button" className="btn btn--quiet" onClick={() => here.forEach((s) => setChapterRead(s.plan.slug, chapterKey, false))}>
            ✓ Read · Undo
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={() => markChapterRead(chapterKey)}>
            Mark as read
          </button>
        )}
        {read && next && nextHref ? (
          <Link href={nextHref} className="btn btn--primary">
            {behind ? "Catch up" : "Next"}: {chapterLabel(next)}
          </Link>
        ) : null}
        {read && !next ? <span className="plan-bar__done">Plan finished. Well done.</span> : null}
      </div>
    </section>
  );
}
