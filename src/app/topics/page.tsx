import type { Metadata } from "next";
import Link from "next/link";
import { BookFilter } from "@/components/BookFilter";
import { TOPICS } from "@/lib/topics";

export const metadata: Metadata = {
  title: "Bible verses by topic",
  description: `Bible verses about ${TOPICS.length} topics, from anxiety, hope and grief to marriage, money and prayer.`,
  alternates: { canonical: "/topics" },
};

const featured = TOPICS.filter((t) => t.source === "curated");

/** The rest, A to Z by name, grouped by first letter. */
const byLetter = Object.entries(
  TOPICS.filter((t) => t.source !== "curated")
    .sort((a, b) => a.name.localeCompare(b.name))
    .reduce<Record<string, typeof TOPICS>>((groups, t) => {
      const letter = t.name.charAt(0).toUpperCase();
      (groups[letter] ??= []).push(t);
      return groups;
    }, {}),
);

/** What the filter matches on: the name, without spaces or apostrophes. */
const filterKey = (name: string) => name.toLowerCase().replace(/[\s’']+/g, "");

export default function TopicsPage() {
  return (
    <main id="content" className="page">
      <div className="index-head">
        <div>
          <h1 className="index-title">Topics</h1>
          <p className="index-sub">Well-known verses, gathered by what you are going through.</p>
        </div>
        <BookFilter targetId="all-topics" label="Find a topic" />
      </div>
      <p id="all-topics-empty" className="index-sub" role="status" hidden>
        No topic matches that. Try one word, like “hope” or “work”.
      </p>
      <div id="all-topics" style={{ display: "flex", flexDirection: "column", gap: 48 }}>
        <section className="testament" aria-labelledby="start-here">
          <h2 id="start-here">Start here</h2>
          <ul className="link-list topic-list">
            {featured.map((t) => (
              <li key={t.slug} data-book={filterKey(t.name)}>
                <Link href={`/topics/${t.slug}`}>
                  <span>
                    <span className="topic-name">Verses about {t.phrase}</span>
                    <span className="topic-intro">{t.intro}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="testament" aria-labelledby="a-to-z">
          <h2 id="a-to-z">All topics, A to Z</h2>
          <div className="book-groups">
            {byLetter.map(([letter, topics]) => (
              <div key={letter} className="book-group">
                <h3>{letter}</h3>
                <ul>
                  {topics.map((t) => (
                    <li key={t.slug} data-book={filterKey(t.name)}>
                      <Link className="bk" href={`/topics/${t.slug}`}>
                        <span>{t.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
      <p className="copyright">
        Many of these lists were chosen with help from <a href="https://www.openbible.info/topics/">OpenBible.info</a> (CC BY).
      </p>
    </main>
  );
}
