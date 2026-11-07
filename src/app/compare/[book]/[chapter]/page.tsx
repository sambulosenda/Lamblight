import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompareView, type CompareRow } from "@/components/CompareView";
import { getChapter, nextChapter, previousChapter } from "@/lib/bible";
import { BOOKS, bookBySlug, chapterName } from "@/lib/books";
import { chapterPath, comparePath, versePath } from "@/lib/site";
import { AVAILABLE_VERSIONS, DEFAULT_VERSION } from "@/lib/versions";

/** Every chapter in every self-hosted version, side by side. Static: nothing depends on the request. */
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return BOOKS.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => ({ book: b.slug, chapter: String(i + 1) })));
}

async function resolve(raw: { book: string; chapter: string }) {
  const book = bookBySlug(raw.book);
  const n = Number(raw.chapter);
  if (!book || !/^\d+$/.test(raw.chapter) || n < 1 || n > book.chapters) notFound();
  const chapters = await Promise.all(AVAILABLE_VERSIONS.map((v) => getChapter(v.id, book.code, n)));
  const versions = AVAILABLE_VERSIONS.filter((_, i) => chapters[i]);
  if (!versions.length) notFound();
  const numbers = [...new Set(chapters.flatMap((c) => c?.verses.map(([v]) => v) ?? []))].sort((a, b) => a - b);
  const rows: CompareRow[] = numbers.map((v) => ({
    verse: v,
    texts: Object.fromEntries(AVAILABLE_VERSIONS.map((ver, i) => [ver.id, chapters[i]?.verses.find(([x]) => x === v)?.[1] ?? ""])),
  }));
  const bsb = chapters[AVAILABLE_VERSIONS.findIndex((v) => v.id === DEFAULT_VERSION)];
  return { book, n, rows, versions, studyVerses: bsb?.verses.map(([v]) => v) ?? [] };
}

export async function generateMetadata({ params }: PageProps<"/compare/[book]/[chapter]">): Promise<Metadata> {
  const { book, n, versions } = await resolve(await params);
  const names = versions.map((v) => v.abbreviation).join(", ");
  return {
    title: `Compare ${chapterName(book)} ${n}: ${names} side by side`,
    description: `${chapterName(book)} ${n} in the ${versions.map((v) => v.name).join(", ")}, verse by verse, with the differences shaded.`,
    alternates: { canonical: comparePath(book.slug, n) },
  };
}

export default async function ComparePage({ params }: PageProps<"/compare/[book]/[chapter]">) {
  const { book, n, rows, versions, studyVerses } = await resolve(await params);
  const prev = previousChapter(book, n);
  const next = nextChapter(book, n);
  const firstStudy = studyVerses[0];
  return (
    <main id="content" className="compare">
      <nav aria-label="Mode" className="study-modes">
        <Link href={chapterPath(DEFAULT_VERSION, book.slug, n)}>Read</Link>
        <span aria-current="page">Compare</span>
        {firstStudy ? <Link href={`${versePath(DEFAULT_VERSION, book.slug, n, firstStudy)}/study`}>Study</Link> : null}
      </nav>
      <h1 className="running-head compare__head">
        <span>{book.title}</span>
        <span>
          <span className="sr-only">, </span>
          {book.code === "PSA" ? "Psalm" : "Chapter"} {n} <span className="sr-only">compared</span>
        </span>
      </h1>
      <CompareView
        rows={rows}
        versions={versions.map((v) => ({ id: v.id, abbreviation: v.abbreviation, name: v.name }))}
        bookSlug={book.slug}
        chapter={n}
        studyVerses={studyVerses}
        testament={book.testament}
      />
      <p className="copyright">All three versions are in the public domain: the Berean Standard Bible, the World English Bible and the King James Version.</p>
      <nav aria-label="Chapters" className="pager">
        {prev ? (
          <Link href={comparePath(prev.book.slug, prev.chapter)} rel="prev">
            <span className="pager__label">Previous</span>
            <span className="pager__ref">
              {chapterName(prev.book)} {prev.chapter}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={comparePath(next.book.slug, next.chapter)} rel="next" className="pager__next">
            <span className="pager__label">Next</span>
            <span className="pager__ref">
              {chapterName(next.book)} {next.chapter}
            </span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
