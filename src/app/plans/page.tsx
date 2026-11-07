import type { Metadata } from "next";
import Link from "next/link";
import { PlanListStatus } from "@/components/PlanListStatus";
import { PLANS, planChapterCount } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Bible reading plans",
  description: "Free Bible reading plans: the Bible in a year, the New Testament in 90 days, Psalms and Proverbs in a month, and the Gospels in 30 days. No account needed.",
  alternates: { canonical: "/plans" },
};

export default function PlansPage() {
  return (
    <main id="content" className="page">
      <div>
        <h1 className="index-title">Reading plans</h1>
        <p className="index-sub">Read a little every day, at your own pace. No account needed: your progress stays on this device.</p>
      </div>
      <ul className="link-list topic-list">
        {PLANS.map((p) => (
          <li key={p.slug}>
            <Link href={`/plans/${p.slug}`}>
              <span>
                <span className="topic-name">
                  {p.name} <PlanListStatus slug={p.slug} />
                </span>
                <span className="topic-intro">
                  {p.intro} {p.days.length} days, {planChapterCount(p)} chapters.
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
