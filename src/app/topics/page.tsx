import type { Metadata } from "next";
import Link from "next/link";
import { TOPICS } from "@/lib/topics";

export const metadata: Metadata = {
  title: "Bible verses by topic",
  description: "Short lists of well-known Bible verses about anxiety, hope, strength, grief, peace, love, forgiveness and fear.",
  alternates: { canonical: "/topics" },
};

export default function TopicsPage() {
  return (
    <main id="content" className="page">
      <div>
        <h1 className="index-title">Topics</h1>
        <p className="index-sub">Well-known verses, gathered by what you are going through.</p>
      </div>
      <ul className="link-list topic-list">
        {TOPICS.map((t) => (
          <li key={t.slug}>
            <Link href={`/topics/${t.slug}`}>
              <span>
                <span className="topic-name">Verses about {t.name.toLowerCase()}</span>
                <span className="topic-intro">{t.intro}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
