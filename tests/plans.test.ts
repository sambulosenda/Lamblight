import { describe, expect, it } from "vitest";
import { BOOKS } from "../src/lib/books";
import { activePlans, parseProgress, planStatus } from "../src/lib/plan-progress";
import { PLANS, dayLabel, planBySlug, splitIntoDays } from "../src/lib/plans";

const total = BOOKS.reduce((n, b) => n + b.chapters, 0);

describe("plans", () => {
  it("splits chapters evenly, in order, without losing any", () => {
    const days = splitIntoDays(["a", "b", "c", "d", "e", "f", "g"], 3);
    expect(days.flat()).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
    expect(days.map((d) => d.length)).toEqual([2, 3, 2]);
  });

  it("reads every chapter of the Bible exactly once in a year", () => {
    const plan = planBySlug("bible-in-a-year")!;
    expect(plan.days).toHaveLength(365);
    const all = plan.days.flat();
    expect(all).toHaveLength(total);
    expect(new Set(all).size).toBe(total);
    expect(all[0]).toBe("GEN.1");
    expect(all[all.length - 1]).toBe("REV.22");
    for (const d of plan.days) expect(d.length).toBeGreaterThanOrEqual(3);
  });

  it("covers all 150 psalms and 31 proverbs once each in a month", () => {
    const all = planBySlug("psalms-and-proverbs")!.days.flat();
    expect(all.filter((k) => k.startsWith("PSA.")).sort()).toHaveLength(150);
    expect(new Set(all).size).toBe(181);
    expect(planBySlug("psalms-and-proverbs")!.days[30]).toEqual(["PRO.31"]);
  });

  it("has unique slugs and no empty days", () => {
    expect(new Set(PLANS.map((p) => p.slug)).size).toBe(PLANS.length);
    for (const p of PLANS) for (const d of p.days) expect(d.length, p.slug).toBeGreaterThan(0);
  });

  it("labels a day's reading", () => {
    expect(dayLabel(["GEN.1", "GEN.2", "GEN.3"])).toEqual(["Genesis 1–3"]);
    expect(dayLabel(["GEN.50", "EXO.1"])).toEqual(["Genesis 50", "Exodus 1"]);
    expect(dayLabel(["PSA.1", "PSA.31", "PRO.1"])).toEqual(["Psalms 1, 31", "Proverbs 1"]);
    expect(dayLabel(["PSA.23"])).toEqual(["Psalm 23"]);
  });
});

describe("plan progress", () => {
  const plan = planBySlug("gospels-in-30-days")!;

  it("is on the first day with an unread chapter, at the reader's own pace", () => {
    const s = planStatus(plan, { started: 0, done: [...plan.days[0], plan.days[1][0]] });
    expect(s.day).toBe(1);
    expect(s.chaptersDone).toBe(plan.days[0].length + 1);
    expect(s.finished).toBe(false);
  });

  it("goes back to an earlier day if a chapter there is unticked", () => {
    const done = plan.days.slice(0, 5).flat().filter((k) => k !== plan.days[2][0]);
    expect(planStatus(plan, { started: 0, done }).day).toBe(2);
  });

  it("knows when a plan is finished", () => {
    const s = planStatus(plan, { started: 0, done: plan.days.flat() });
    expect(s.finished).toBe(true);
    expect(s.day).toBe(plan.days.length);
  });

  it("ignores malformed storage and unknown plans", () => {
    expect(parseProgress(null)).toEqual({});
    expect(parseProgress("not json")).toEqual({});
    expect(parseProgress("[]")).toEqual({});
    expect(parseProgress(JSON.stringify({ nope: { started: 1, done: [] }, "gospels-in-30-days": { started: 1, done: ["MAT.1", 5] } }))).toEqual({
      "gospels-in-30-days": { started: 1, done: ["MAT.1"] },
    });
  });

  it("lists started plans newest first", () => {
    const list = activePlans({ "gospels-in-30-days": { started: 1, done: [] }, "bible-in-a-year": { started: 2, done: [] } });
    expect(list.map((s) => s.plan.slug)).toEqual(["bible-in-a-year", "gospels-in-30-days"]);
  });
});
