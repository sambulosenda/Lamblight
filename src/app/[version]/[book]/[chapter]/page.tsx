import type { Metadata } from "next";
import Link from "next/link";
import { ChapterPicker } from "@/components/ChapterPicker";
import { ChapterText, Footnotes } from "@/components/ChapterText";
import { ReaderSettings } from "@/components/ReaderSettings";
import { VerseSelect } from "@/components/VerseSelect";
import { VersionPicker } from "@/components/VersionPicker";
import { nextChapter, previousChapter } from "@/lib/bible";
import { BOOKS, chapterName } from "@/lib/books";
import { breadcrumbs, JsonLd } from "@/lib/jsonld";
import { resolveChapter } from "@/lib/params";
import { chapterPath } from "@/lib/site";
import { AVAILABLE_VERSIONS } from "@/lib/versions";

/** Every chapter is prerendered; nothing here depends on the request. */
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return AVAILABLE_VERSIONS.flatMap((v) =>
    BOOKS.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => ({ version: v.id, book: b.slug, chapter: String(i + 1) }))),
  );
}

export async function generateMetadata({ params }: PageProps<"/[version]/[book]/[chapter]">): Promise<Metadata> {
  const { version, book, chapter } = await resolveChapter(await params);
  const heading = chapter.blocks.find((b) => b.t === "s1")?.c.filter((c) => typeof c === "string").join("");
  const firstVerse = chapter.verses[0]?.[1] ?? "";
  const title = `${chapterName(book)} ${chapter.n} ${version.abbreviation}${heading ? `: ${heading}` : ""}`;
  const description = `Read ${chapterName(book)} ${chapter.n} in the ${version.name}. ${firstVerse}`.slice(0, 160);
  const path = chapterPath(version.id, book.slug, chapter.n);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "article" },
  };
}

export default async function ChapterPage({ params }: PageProps<"/[version]/[book]/[chapter]">) {
  const { version, book, chapter, meta } = await resolveChapter(await params);
  const prev = previousChapter(book, chapter.n);
  const next = nextChapter(book, chapter.n);
  const path = chapterPath(version.id, book.slug, chapter.n);

  return (
    <>
      <JsonLd
        data={breadcrumbs([
          { name: version.abbreviation, path: `/${version.id}` },
          { name: book.name, path: `/${version.id}/${book.slug}` },
          { name: `${chapterName(book)} ${chapter.n}`, path },
        ])}
      />
      <div className="reader-bar">
        <ChapterPicker version={version.id} bookCode={book.code} chapter={chapter.n} label={`${chapterName(book)} ${chapter.n}`} />
        <VersionPicker version={version.id} path={`/${book.slug}/${chapter.n}`} />
        <span className="reader-bar__spacer" />
        <ReaderSettings />
      </div>
      <main id="content" className="reader">
        <p className="reader__book">{book.title}</p>
        <h1 className="reader__title">
          {chapterName(book)} {chapter.n}
        </h1>
        <VerseSelect verses={chapter.verses} bookName={chapterName(book)} chapter={chapter.n} versionAbbr={version.abbreviation} chapterHref={path}>
          <ChapterText chapter={chapter} bookCode={book.code} />
        </VerseSelect>
        <p className="copyright">
          {meta.name} ({meta.abbreviation}). {meta.copyright}
        </p>
        <Footnotes chapter={chapter} />
        <nav aria-label="Chapters" className="pager">
          {prev ? (
            <Link href={chapterPath(version.id, prev.book.slug, prev.chapter)} rel="prev">
              ← {chapterName(prev.book)} {prev.chapter}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={chapterPath(version.id, next.book.slug, next.chapter)} rel="next">
              {chapterName(next.book)} {next.chapter} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </main>
    </>
  );
}
