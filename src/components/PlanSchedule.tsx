"use client";

import Link from "next/link";
import { useState } from "react";
import { useHydrated } from "@/lib/marks";
import { planStatus, setChapterRead, startPlan, stopPlan, usePlanProgress } from "@/lib/plan-progress";
import { chapterLabel, dayLabel, parseChapterKey, planBySlug } from "@/lib/plans";
import { chapterPath } from "@/lib/site";
import { DEFAULT_VERSION } from "@/lib/versions";

const href = (k: string) => {
  const p = parseChapterKey(k)!;
  return chapterPath(DEFAULT_VERSION, p.book.slug, p.chapter);
};

/**
 * A plan's controls and full schedule. The schedule is rendered on the server (so it
 * is indexable); ticks and progress appear once the page can read this browser's storage.
 */
export function PlanSchedule({ slug }: { slug: string }) {
  const plan = planBySlug(slug)!;
  const all = usePlanProgress();
  const hydrated = useHydrated();
  const progress = hydrated ? all[slug] : undefined;
  const status = progress ? planStatus(plan, progress) : null;
  const done = new Set(progress?.done ?? []);
  const today = status && !status.finished ? plan.days[status.day] : null;
  const nextChapter = today?.find((k) => !done.has(k));
  const [confirmStop, setConfirmStop] = useState(false);

  return (
    <>
      <div className="plan-controls" aria-live="polite">
        {!hydrated ? (
          <div className="plan-controls__pending" aria-hidden="true" />
        ) : status ? (
          <>
            <p className="plan-controls__status">
              {status.finished ? (
                <>Finished. Well done.</>
              ) : (
                <>
                  Day {status.day + 1} of {plan.days.length} · {dayLabel(today!).join(", ")}
                </>
              )}
            </p>
            <progress className="plan-progress" max={status.chaptersTotal} value={status.chaptersDone}>
              {status.chaptersDone} of {status.chaptersTotal} chapters
            </progress>
            <p className="plan-controls__count">
              {status.chaptersDone} of {status.chaptersTotal} chapters read
            </p>
            <div className="plan-controls__actions">
              {nextChapter ? (
                <Link href={href(nextChapter)} className="btn btn--primary">
                  Read {chapterLabel(nextChapter)}
                </Link>
              ) : null}
              {confirmStop ? (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      stopPlan(slug);
                      setConfirmStop(false);
                    }}
                  >
                    Yes, stop and clear progress
                  </button>
                  <button type="button" className="btn btn--quiet" onClick={() => setConfirmStop(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn--quiet" onClick={() => setConfirmStop(true)}>
                  Stop plan
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="plan-controls__status">Go at your own pace. Your progress stays on this device; nothing is sent anywhere.</p>
            <div className="plan-controls__actions">
              <button type="button" className="btn btn--primary" onClick={() => startPlan(slug)}>
                Start this plan
              </button>
            </div>
          </>
        )}
      </div>

      <ol className="plan-days">
        {plan.days.map((day, i) => {
          const allDone = day.every((k) => done.has(k));
          return (
            <li key={i} className={`plan-day${status && i === status.day ? " plan-day--today" : ""}${allDone ? " plan-day--done" : ""}`}>
              <span className="plan-day__n">Day {i + 1}</span>
              <ul className="plan-day__chapters">
                {day.map((k) => (
                  <li key={k}>
                    {progress ? (
                      <input
                        type="checkbox"
                        checked={done.has(k)}
                        onChange={(e) => setChapterRead(slug, k, e.target.checked)}
                        aria-label={`${chapterLabel(k)} read`}
                      />
                    ) : null}
                    <Link href={href(k)}>{chapterLabel(k)}</Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </>
  );
}
