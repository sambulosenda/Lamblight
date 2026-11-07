import Link from "next/link";
import { ContinueReading } from "@/components/ContinueReading";
import { withDivineName } from "@/components/DivineName";
import { SubscribeForm } from "@/components/SubscribeForm";
import { CopyVerseButton, ShareVerseButton } from "@/components/VerseActions";
import { cacheLife } from "next/cache";
import { getChapter } from "@/lib/bible";
import { BOOKS, bookByCode, chapterName } from "@/lib/books";
import { chapterPath, versePath } from "@/lib/site";
import { DEFAULT_VERSION } from "@/lib/versions";
import { HOME_TOPICS, topicBySlug } from "@/lib/topics";
import { votdForDate } from "@/lib/votd";

const POPULAR_OT = ["GEN", "PSA", "PRO", "ISA"];
const POPULAR_NT = ["MAT", "JHN", "ROM", "JAS"];

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
      <h2 id="votd" className="smallcaps-head">
        Verse for {date}
      </h2>
      <blockquote>{withDivineName(text)}</blockquote>
      <p className="attribution">
        <Link href={versePath(DEFAULT_VERSION, book.slug, chapter, verse)}>{ref}</Link> · Berean Standard Bible
      </p>
      <div className="actions">
        <Link href={chapterPath(DEFAULT_VERSION, book.slug, chapter)} className="btn btn--primary">
          Read {chapterName(book)} {chapter}
        </Link>
        <CopyVerseButton text={text} reference={ref} versionAbbr="BSB" />
        <ShareVerseButton text={text} reference={ref} versionAbbr="BSB" path={versePath(DEFAULT_VERSION, book.slug, chapter, verse)} />
      </div>
    </section>
  );
}

function BookRows({ codes }: { codes: string[] }) {
  return (
    <ul className="rows">
      {codes.map((code) => {
        const b = bookByCode(code)!;
        return (
          <li key={code}>
            <Link href={`/${DEFAULT_VERSION}/${b.slug}`}>
              <span>{b.name}</span>
              <span className="ct" aria-label={`${b.chapters} chapters`}>
                {b.chapters}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function Home() {
  const otCount = BOOKS.filter((b) => b.testament === "OT").length;
  const ntCount = BOOKS.length - otCount;
  return (
    <main id="content" className="home">
      <div className="home-top">
        <VerseOfTheDay />
        <ContinueReading fallback={{ href: chapterPath(DEFAULT_VERSION, "john", 1), label: "John 1" }} />
        {/* After the reading card on phones, so reading comes before the sign-up. */}
        <div className="home-signup">
          <SubscribeForm compact />
        </div>
      </div>
      <div className="home-index">
        <section aria-labelledby="ot">
          <h2 id="ot">Old Testament</h2>
          <BookRows codes={POPULAR_OT} />
          <Link href={`/${DEFAULT_VERSION}`} className="more">
            All {otCount} books
          </Link>
        </section>
        <section aria-labelledby="nt">
          <h2 id="nt">New Testament</h2>
          <BookRows codes={POPULAR_NT} />
          <Link href={`/${DEFAULT_VERSION}#t-NT`} className="more">
            All {ntCount} books
          </Link>
        </section>
        <section aria-labelledby="topics">
          <h2 id="topics">When you need</h2>
          <ul className="rows">
            {HOME_TOPICS.map((slug) => topicBySlug(slug)!).map((t) => (
              <li key={t.slug}>
                <Link href={`/topics/${t.slug}`}>
                  <span>{t.name}</span>
                  <span className="ct" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/topics" className="more">
            All topics
          </Link>
        </section>
      </div>
    </main>
  );
}
