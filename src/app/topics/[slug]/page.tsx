import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { withDivineName } from "@/components/DivineName";
import { getChapter } from "@/lib/bible";
import { bookByCode, chapterName } from "@/lib/books";
import { breadcrumbs, JsonLd } from "@/lib/jsonld";
import { versePath } from "@/lib/site";
import { TOPICS, parseTopicVerse, topicBySlug } from "@/lib/topics";
import { DEFAULT_VERSION } from "@/lib/versions";

export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.slug }));
}

async function resolve(params: Promise<{ slug: string }>) {
  const topic = topicBySlug((await params).slug);
  if (!topic) notFound();
  return topic;
}

export async function generateMetadata({ params }: PageProps<"/topics/[slug]">): Promise<Metadata> {
  const topic = await resolve(params);
  return {
    title: `Bible verses about ${topic.name.toLowerCase()} (BSB)`,
    description: `${topic.verses.length} Bible verses about ${topic.name.toLowerCase()}. ${topic.intro} Berean Standard Bible.`,
    alternates: { canonical: `/topics/${topic.slug}` },
  };
}

async function loadVerses(ids: string[]) {
  return Promise.all(
    ids.map(async (id) => {
      const { code, chapter, start, end } = parseTopicVerse(id);
      const book = bookByCode(code)!;
      const ch = await getChapter(DEFAULT_VERSION, code, chapter);
      const text = (ch?.verses ?? [])
        .filter(([n]) => n >= start && n <= end)
        .map(([, t]) => t)
        .join(" ");
      const ref = `${chapterName(book)} ${chapter}:${start}${end > start ? `–${end}` : ""}`;
      return { id, ref, text, href: versePath(DEFAULT_VERSION, book.slug, chapter, start) };
    }),
  );
}

export default async function TopicPage({ params }: PageProps<"/topics/[slug]">) {
  const topic = await resolve(params);
  const verses = await loadVerses(topic.verses);
  const others = TOPICS.filter((t) => t.slug !== topic.slug);
  return (
    <main id="content" className="page">
      <JsonLd
        data={breadcrumbs([
          { name: "Topics", path: "/topics" },
          { name: topic.name, path: `/topics/${topic.slug}` },
        ])}
      />
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <ol>
          <li>
            <Link href="/topics">Topics</Link>
          </li>
          <li aria-current="page">{topic.name}</li>
        </ol>
      </nav>
      <div>
        <h1 className="index-title">Verses about {topic.name.toLowerCase()}</h1>
        <p className="index-sub">{topic.intro}</p>
      </div>
      <ol className="results topic-verses">
        {verses.map((v) => (
          <li key={v.id}>
            <Link href={v.href}>
              <span className="ref">{v.ref}</span>
              <span className="text">{withDivineName(v.text)}</span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="copyright">Berean Standard Bible. Public domain.</p>
      <section aria-labelledby="more-topics">
        <h2 id="more-topics" className="section-title">
          More topics
        </h2>
        <ul className="book-links">
          {others.map((t) => (
            <li key={t.slug}>
              <Link href={`/topics/${t.slug}`}>{t.name}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
