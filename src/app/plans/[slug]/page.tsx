import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanSchedule } from "@/components/PlanSchedule";
import { breadcrumbs, JsonLd } from "@/lib/jsonld";
import { PLANS, planBySlug, planChapterCount } from "@/lib/plans";

/** Every plan is known at build time; nothing here depends on the request. */
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return PLANS.map((p) => ({ slug: p.slug }));
}

async function resolve(params: Promise<{ slug: string }>) {
  const plan = planBySlug((await params).slug);
  if (!plan) notFound();
  return plan;
}

export async function generateMetadata({ params }: PageProps<"/plans/[slug]">): Promise<Metadata> {
  const plan = await resolve(params);
  return {
    title: `${plan.name}: a free Bible reading plan`,
    description: `${plan.intro} ${plan.days.length} days, ${planChapterCount(plan)} chapters. Free, no account needed.`,
    alternates: { canonical: `/plans/${plan.slug}` },
  };
}

export default async function PlanPage({ params }: PageProps<"/plans/[slug]">) {
  const plan = await resolve(params);
  return (
    <main id="content" className="page">
      <JsonLd
        data={breadcrumbs([
          { name: "Reading plans", path: "/plans" },
          { name: plan.name, path: `/plans/${plan.slug}` },
        ])}
      />
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <ol>
          <li>
            <Link href="/plans">Reading plans</Link>
          </li>
          <li aria-current="page">{plan.name}</li>
        </ol>
      </nav>
      <div>
        <h1 className="index-title">{plan.name}</h1>
        <p className="index-sub">
          {plan.intro} {plan.days.length} days, {planChapterCount(plan)} chapters.
        </p>
      </div>
      <PlanSchedule slug={plan.slug} />
    </main>
  );
}
