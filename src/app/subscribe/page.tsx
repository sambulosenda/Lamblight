import type { Metadata } from "next";
import Link from "next/link";
import { SubscribeForm } from "@/components/SubscribeForm";

export const metadata: Metadata = {
  title: "Verse of the day by email",
  description: "One Bible verse in your inbox each morning, free and without ads.",
  alternates: { canonical: "/subscribe" },
};

export default function SubscribePage() {
  return (
    <main id="content" className="page prose-page">
      <div>
        <p className="smallcaps-head index-label">Each morning</p>
        <h1 className="index-title">A verse in your inbox</h1>
        <p className="index-sub">The day’s verse from the Berean Standard Bible, with a link to read the whole chapter.</p>
      </div>
      <SubscribeForm />
      <p className="prose-small">
        We only use your address to send the daily verse. See <Link href="/privacy">privacy</Link>.
      </p>
    </main>
  );
}
