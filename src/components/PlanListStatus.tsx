"use client";

import { useHydrated } from "@/lib/marks";
import { planStatus, usePlanProgress } from "@/lib/plan-progress";
import { planBySlug } from "@/lib/plans";

/** "Day 12 of 365" next to a plan the reader has started on this device. */
export function PlanListStatus({ slug }: { slug: string }) {
  const all = usePlanProgress();
  const hydrated = useHydrated();
  const progress = hydrated ? all[slug] : undefined;
  if (!progress) return null;
  const plan = planBySlug(slug)!;
  const s = planStatus(plan, progress);
  return <span className="plan-badge">{s.finished ? "Finished" : `Day ${s.day + 1} of ${plan.days.length}`}</span>;
}
