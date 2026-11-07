import type { Metadata } from "next";
import Link from "next/link";
import { ChapterPicker } from "@/components/ChapterPicker";
import { ChapterText, Footnotes, psalterBook } from "@/components/ChapterText";
import { ReaderSettings } from "@/components/ReaderSettings";
import { VerseSelect } from "@/components/VerseSelect";
import { VersionPicker } from "@/components/VersionPicker";
import { getAudioTrack } from "@/lib/audio";
import { getChapter, nextChapter, previousChapter } from "@/lib/bible";
import { BOOKS, chapterName } from "@/lib/books";
import { HEADING_BLOCKS } from "@/lib/scripture";
import { breadcrumbs, JsonLd } from "@/lib/jsonld";
import { resolveChapter } from "@/lib/params";
import { chapterPath, comparePath, versePath } from "@/lib/site";
import { ContinueInto } from "@/components/ContinueInto";
import { ListenButton } from "@/components/ListenButton";
import { PlanChapterBar } from "@/components/PlanChapterBar";
import type { Chapter } from "@/lib/scripture";
import { AVAILABLE_VERSIONS, DEFAULT_VERSION } from "@/lib/versions";

/** Every chapter is prerendered; nothing here depends on the request. */
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return AVAILABLE_VERSIONS.flatMap((v) =>
    BOOKS.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => ({ version: v.id, book: b.slug, chapter: String(i + 1) }))),
  );
}

/** How John 3:16 reads in each version, for the version switcher. */
async function versionPreviews(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const v of AVAILABLE_VERSIONS) {
    const t = (await getChapter(v.id, "JHN", 3))?.verses.find(([n]) => n === 16)?.[1];
    if (t) out[v.id] = t;
  }
  return out;
}

/** The first paragraph of a chapter, shown faded under the one before so reading runs on. */
async function openingOf(version: string, code: string, n: number): Promise<Chapter | null> {
  const ch = await getChapter(version, code, n);
  if (!ch) return null;
  const end = ch.blocks.findIndex((b) => b.t !== "b" && !HEADING_BLOCKS.has(b.t) && b.c.some((it) => typeof it === "object" && "v" in it));
  if (end < 0) return null;
  const blocks = ch.blocks.slice(0, end + 1).map((b) => ({ ...b, c: b.c.filter((it) => !(typeof it === "object" && "f" in it)) }));
  return { ...ch, blocks, notes: [] };
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
  const previews = await versionPreviews();
  const words = chapter.verses.reduce((n, [, t]) => n + t.split(/\s+/).filter(Boolean).length, 0);
  const minutes = Math.max(1, Math.round(words / 230));
  const teaser = next ? await openingOf(version.id, next.book.code, next.chapter) : null;
  const audio = await getAudioTrack(version.id, book, chapter.n);
  const nextAudio = audio && next ? await getAudioTrack(version.id, next.book, next.chapter) : null;
  const studyVerses =
    version.id === DEFAULT_VERSION ? chapter.verses.map(([v]) => v) : ((await getChapter(DEFAULT_VERSION, book.code, chapter.n))?.verses.map(([v]) => v) ?? []);

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
        <VersionPicker version={version.id} path={`/${book.slug}/${chapter.n}`} previews={previews} />
        <span className="reader-bar__spacer" />
        {audio ? <ListenButton track={audio} next={nextAudio} /> : null}
        <nav aria-label="Mode" className="reader-modes">
          <Link href={comparePath(book.slug, chapter.n)}>Compare</Link>
          {studyVerses.length ? <Link href={`${versePath(DEFAULT_VERSION, book.slug, chapter.n, studyVerses[0])}/study`}>Study</Link> : null}
        </nav>
        <ReaderSettings />
      </div>
      <main id="content" className="reader">
        <h1 className="running-head">
          <span>{book.title}</span>
          <span>
            <span className="sr-only">, </span>
            {book.code === "PSA" ? (
              <>
                Psalm {chapter.n}
                <span className="running-head__extra">
                  <span className="sr-only">, </span>
                  {psalterBook(chapter.n)}
                </span>
              </>
            ) : (
              <>Chapter {chapter.n}</>
            )}
          </span>
        </h1>
        <p className="chapter-meta">
          <span>
            {book.code === "PSA" ? "Psalm" : "Chapter"} {chapter.n} of {book.chapters}
          </span>
          <span>
            {chapter.verses.length} verses · about {minutes} {minutes === 1 ? "minute" : "minutes"}
          </span>
        </p>
        <VerseSelect verses={chapter.verses} bookName={chapterName(book)} chapter={chapter.n} versionAbbr={version.abbreviation} versionId={version.id} bookCode={book.code} chapterHref={path} studyVerses={studyVerses}>
          <ChapterText chapter={chapter} bookCode={book.code} />
        </VerseSelect>
        <p className="copyright">
          {meta.name} ({meta.abbreviation}). {meta.copyright}
        </p>
        <Footnotes chapter={chapter} />
        <PlanChapterBar chapterKey={`${book.code}.${chapter.n}`} version={version.id} />
        <div className="fleuron" aria-hidden="true">
          · · ·
        </div>
        {next && teaser ? (
          <ContinueInto
            href={chapterPath(version.id, next.book.slug, next.chapter)}
            label={`${chapterName(next.book)} ${next.chapter}`}
            back={prev ? { href: chapterPath(version.id, prev.book.slug, prev.chapter), label: `${chapterName(prev.book)} ${prev.chapter}` } : null}
          >
            <ChapterText chapter={teaser} bookCode={next.book.code} />
          </ContinueInto>
        ) : null}
        <nav aria-label="Chapters" className="pager">
          {prev ? (
            <Link href={chapterPath(version.id, prev.book.slug, prev.chapter)} rel="prev">
              <span className="pager__label">Previous</span>
              <span className="pager__ref">
                {chapterName(prev.book)} {prev.chapter}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={chapterPath(version.id, next.book.slug, next.chapter)} rel="next" className="pager__next">
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
    </>
  );
}
