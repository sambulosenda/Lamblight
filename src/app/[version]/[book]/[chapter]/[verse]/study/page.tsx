import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Noto_Serif, Noto_Serif_Hebrew } from "next/font/google";
import { withDivineName } from "@/components/DivineName";
import { StudyPanel } from "@/components/StudyPanel";
import { chapterName } from "@/lib/books";
import { resolveChapter } from "@/lib/params";
import { chapterPath, versePath } from "@/lib/site";
import { getStudy } from "@/lib/study";
import { DEFAULT_VERSION } from "@/lib/versions";

const greek = Noto_Serif({ subsets: ["greek"], variable: "--font-greek", display: "swap" });
const hebrew = Noto_Serif_Hebrew({ subsets: ["hebrew"], variable: "--font-hebrew", display: "swap" });

/** Study mode is rendered on first visit and then cached; nothing is prerendered at build. */
export const ensureStatic = "navigation";
export function generateStaticParams() {
  return [{ version: DEFAULT_VERSION, book: "john", chapter: "3", verse: "16" }];
}

async function resolve(raw: { version: string; book: string; chapter: string; verse: string }) {
  if (raw.version !== DEFAULT_VERSION) notFound();
  const data = await resolveChapter(raw);
  const n = Number(raw.verse);
  const index = /^\d+$/.test(raw.verse) ? data.chapter.verses.findIndex(([v]) => v === n) : -1;
  if (index < 0) notFound();
  const study = await getStudy(data.version.id, data.book.code, data.chapter.n, n);
  if (!study) notFound();
  return { ...data, n, index, study };
}

export async function generateMetadata({ params }: PageProps<"/[version]/[book]/[chapter]/[verse]/study">): Promise<Metadata> {
  const { book, chapter, n, version } = await resolve(await params);
  const ref = `${chapterName(book)} ${chapter.n}:${n}`;
  return {
    title: `Study ${ref}: ${book.testament === "NT" ? "Greek" : "Hebrew"} words and cross references`,
    description: `The ${book.testament === "NT" ? "Greek" : "Hebrew"} behind each word of ${ref} (${version.abbreviation}), with Strong’s definitions and cross references.`,
    alternates: { canonical: `${versePath(version.id, book.slug, chapter.n, n)}/study` },
  };
}

export default async function StudyPage({ params }: PageProps<"/[version]/[book]/[chapter]/[verse]/study">) {
  const { version, book, chapter, n, index, study } = await resolve(await params);
  const prev = chapter.verses[index - 1];
  const next = chapter.verses[index + 1];
  const ref = `${chapterName(book)} ${chapter.n}:${n}`;
  const lang = book.testament === "NT" ? "grc" : "hbo";
  const first = prev?.[0] ?? n;
  const last = next?.[0] ?? n;
  return (
    <main id="content" className={`study ${greek.variable} ${hebrew.variable}`}>
      <nav aria-label="Mode" className="study-modes">
        <Link href={`${chapterPath(version.id, book.slug, chapter.n)}#${book.code}.${chapter.n}.${n}`}>Read</Link>
        <span aria-current="page">Study</span>
      </nav>
      <div className="study-grid">
        <article className="study-text">
          <p className="running-head">
            <span>{book.title}</span>
            <span>
              {chapter.n} : {first}
              {last > first ? `–${last}` : ""}
            </span>
          </p>
          {prev ? (
            <p className="study-context">
              <Link href={`${versePath(version.id, book.slug, chapter.n, prev[0])}/study`} aria-label={`Study verse ${prev[0]}`}>
                <sup className="vn">{prev[0]}</sup>
              </Link>
              {withDivineName(prev[1])}
            </p>
          ) : null}
          <StudyPanel
            reference={ref}
            bookName={chapterName(book)}
            verseRef={`${chapter.n}:${n}`}
            verseNumber={n}
            noteKey={`${book.code}.${chapter.n}.${n}`}
            lang={lang}
            data={study}
          />
          {next ? (
            <p className="study-context">
              <Link href={`${versePath(version.id, book.slug, chapter.n, next[0])}/study`} aria-label={`Study verse ${next[0]}`}>
                <sup className="vn">{next[0]}</sup>
              </Link>
              {withDivineName(next[1])}
            </p>
          ) : null}
          <nav aria-label="Verses" className="pager">
            {prev ? (
              <Link href={`${versePath(version.id, book.slug, chapter.n, prev[0])}/study`} rel="prev">
                <span className="pager__label">Previous verse</span>
                <span className="pager__ref">
                  {chapterName(book)} {chapter.n}:{prev[0]}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={`${versePath(version.id, book.slug, chapter.n, next[0])}/study`} rel="next" className="pager__next">
                <span className="pager__label">Next verse</span>
                <span className="pager__ref">
                  {chapterName(book)} {chapter.n}:{next[0]}
                </span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </article>
      </div>
    </main>
  );
}
