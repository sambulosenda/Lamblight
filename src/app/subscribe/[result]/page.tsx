import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

/** Where the signup form lands when JavaScript is off. */
const RESULTS = {
  thanks: { title: "You’re subscribed", body: "Today’s verse is on its way. Each morning after that, you’ll get one more." },
  sorry: { title: "That didn’t work", body: "Check the address and try again. If it still fails, daily emails may not be switched on yet." },
} as const;

export const metadata: Metadata = { robots: { index: false } };

export function generateStaticParams() {
  return Object.keys(RESULTS).map((result) => ({ result }));
}

export default async function SubscribeResult({ params }: PageProps<"/subscribe/[result]">) {
  const { result } = await params;
  const r = RESULTS[result as keyof typeof RESULTS];
  if (!r) notFound();
  return (
    <main id="content" className="page prose-page">
      <div>
        <h1 className="index-title">{r.title}</h1>
        <p className="index-sub">{r.body}</p>
      </div>
      <p>
        <Link href={result === "thanks" ? "/" : "/subscribe"} className="btn">
          {result === "thanks" ? "Back to Lamplight" : "Try again"}
        </Link>
      </p>
    </main>
  );
}
