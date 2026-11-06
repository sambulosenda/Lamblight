import Link from "next/link";
import { ContinueReading } from "@/components/ContinueReading";
import { withDivineName } from "@/components/DivineName";
import { CopyVerseButton, ShareVerseButton } from "@/components/VerseActions";
import { cacheLife } from "next/cache";
import { getChapter } from "@/lib/bible";
import { BOOKS, bookByCode, chapterName } from "@/lib/books";
import { chapterPath, versePath } from "@/lib/site";
import { DEFAULT_VERSION } from "@/lib/versions";
import { HOME_TOPICS, topicBySlug } from "@/lib/topics";
import { votdForDate } from "@/lib/votd";

const POPULAR = ["GEN", "PSA", "PRO", "ISA", "MAT", "JHN", "ROM", "PHP", "JAS"];

async function VerseOfTheDay() {
  "use cache";
  cacheLife("hours");
  const now = new Date();
  const { code, chapter, verse } = votdForDate(now);
  const book = bookByCode(code)!;
  const ch = await getChapter(DEFAULT_VERSION, code, chapter);
  const text = ch?.verses.find(([n]) => n === verse)?.[1] ?? "";
  const ref = `${chapterName(book)} ${chapter}:${verse}`;
  const date = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return (
    <section aria-labelledby="votd" className="votd">
      <p id="votd" className="eyebrow">
        Verse of the day · {date}
      </p>
      <blockquote>“{withDivineName(text)}”</blockquote>
      <p className="attribution">
        <Link href={versePath(DEFAULT_VERSION, book.slug, chapter, verse)}>{ref}</Link> · Berean Standard Bible
      </p>
      <div className="actions" style={{ justifyContent: "center" }}>
        <Link href={chapterPath(DEFAULT_VERSION, book.slug, chapter)} className="btn btn--primary">
          Read {chapterName(book)} {chapter}
        </Link>
        <CopyVerseButton text={text} reference={ref} versionAbbr="BSB" />
        <ShareVerseButton text={text} reference={ref} versionAbbr="BSB" path={versePath(DEFAULT_VERSION, book.slug, chapter, verse)} />
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main id="content" className="home">
      <VerseOfTheDay />
      <div className="home-cards">
        <ContinueReading fallback={{ href: chapterPath(DEFAULT_VERSION, "john", 1), label: "John 1" }} />
        <section aria-labelledby="topics" className="card">
          <h2 id="topics">Popular topics</h2>
          <ul className="link-list">
            {HOME_TOPICS.map((slug) => topicBySlug(slug)!).map((t) => (
              <li key={t.slug}>
                <Link href={`/topics/${t.slug}`}>Verses about {t.name.toLowerCase()}</Link>
              </li>
            ))}
          </ul>
          <Link href="/topics" className="more">
            All topics
          </Link>
        </section>
      </div>
      <section aria-labelledby="books" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="row-between">
          <h2 id="books" className="h2-serif">
            Open a book
          </h2>
          <Link href={`/${DEFAULT_VERSION}`}>All 66 books</Link>
        </div>
        <ul className="book-links">
          {BOOKS.filter((b) => POPULAR.includes(b.code)).map((b) => (
            <li key={b.code}>
              <Link href={`/${DEFAULT_VERSION}/${b.slug}`}>{b.name}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
