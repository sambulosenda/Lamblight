import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyVerseButton, ShareVerseButton } from "@/components/VerseActions";
import { VerseImageMaker } from "@/components/VerseImageMaker";
import { getChapter, getVerseNumbers, nextChapter, previousChapter } from "@/lib/bible";
import { BOOKS, chapterName } from "@/lib/books";
import { breadcrumbs, JsonLd } from "@/lib/jsonld";
import { resolveChapter } from "@/lib/params";
import { SITE_URL, chapterPath, versePath } from "@/lib/site";
import { AVAILABLE_VERSIONS } from "@/lib/versions";

/**
 * Single-verse landing page, the main search-engine entry point. Fully static:
 * listed verses are prerendered at build, any other valid verse is rendered once
 * on first request and then served from the cache.
 */
export const ensureStatic = "navigation";

/** Set PRERENDER_ALL_VERSES=1 to build all ~31,000 verse pages up front instead of on first visit. */
export async function generateStaticParams() {
  const all = process.env.PRERENDER_ALL_VERSES === "1";
  const params: { version: string; book: string; chapter: string; verse: string }[] = [];
  for (const v of AVAILABLE_VERSIONS) {
    for (const b of BOOKS) {
      const verses = await getVerseNumbers(v.id, b.code);
      verses.forEach((nums, i) => {
        // By default prerender the first verse of every chapter; the rest render on demand.
        for (const n of all ? nums : nums.slice(0, 1)) {
          params.push({ version: v.id, book: b.slug, chapter: String(i + 1), verse: String(n) });
        }
      });
    }
  }
  return params;
}

async function resolveVerse(raw: { version: string; book: string; chapter: string; verse: string }) {
  const data = await resolveChapter(raw);
  const n = Number(raw.verse);
  const index = /^\d+$/.test(raw.verse) ? data.chapter.verses.findIndex(([v]) => v === n) : -1;
  if (index < 0) notFound();
  return { ...data, n, index, text: data.chapter.verses[index][1] };
}

const clip = (s: string, len: number) => (s.length <= len ? s : `${s.slice(0, len - 1).replace(/\s+\S*$/, "")}…`);

export async function generateMetadata({ params }: PageProps<"/[version]/[book]/[chapter]/[verse]">): Promise<Metadata> {
  const { version, book, chapter, n, text } = await resolveVerse(await params);
  const ref = `${chapterName(book)} ${chapter.n}:${n}`;
  const title = `${ref} ${version.abbreviation}: ${clip(text, 60)}`;
  const description = clip(`${text} ${ref}, ${version.name}.`, 160);
  const path = versePath(version.id, book.slug, chapter.n, n);
  return {
    title: { absolute: `${title} | Lamplight` },
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${ref} (${version.abbreviation})`,
      description: text,
      url: path,
      type: "article",
      images: [{ url: `/img${path}?shape=og`, width: 1200, height: 630, alt: `${ref}: ${clip(text, 100)}` }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function VersePage({ params }: PageProps<"/[version]/[book]/[chapter]/[verse]">) {
  const { version, book, chapter, meta, n, index, text } = await resolveVerse(await params);
  const ref = `${chapterName(book)} ${chapter.n}:${n}`;
  const chapterHref = chapterPath(version.id, book.slug, chapter.n);
  const path = versePath(version.id, book.slug, chapter.n, n);
  const prev = chapter.verses[index - 1];
  const next = chapter.verses[index + 1];
  const prevCh = previousChapter(book, chapter.n);
  const nextCh = nextChapter(book, chapter.n);
  const notes = chapter.notes.filter((note) => note.v === n);
  const others = (
    await Promise.all(
      AVAILABLE_VERSIONS.filter((v) => v.id !== version.id).map(async (v) => {
        const ch = await getChapter(v.id, book.code, chapter.n);
        const t = ch?.verses.find(([num]) => num === n)?.[1];
        return t ? { version: v, text: t } : null;
      }),
    )
  ).filter((x) => x !== null);

  return (
    <main id="content" className="page">
      <JsonLd
        data={[
          breadcrumbs([
            { name: version.abbreviation, path: `/${version.id}` },
            { name: book.name, path: `/${version.id}/${book.slug}` },
            { name: `${chapterName(book)} ${chapter.n}`, path: chapterHref },
            { name: ref, path },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Quotation",
            text,
            url: `${SITE_URL}${path}`,
            isPartOf: { "@type": "Book", name: meta.name, bookEdition: meta.abbreviation, inLanguage: meta.language },
            license: "https://creativecommons.org/publicdomain/mark/1.0/",
          },
        ]}
      />
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <ol>
          <li>
            <Link href={`/${version.id}`}>Bible</Link>
          </li>
          <li>
            <Link href={`/${version.id}/${book.slug}`}>{book.name}</Link>
          </li>
          <li>
            <Link href={chapterHref}>
              {chapterName(book)} {chapter.n}
            </Link>
          </li>
          <li aria-current="page">Verse {n}</li>
        </ol>
      </nav>

      <section className="verse-hero" aria-labelledby="verse-ref">
        <h1 id="verse-ref">{ref}</h1>
        <blockquote cite={`${SITE_URL}${path}`}>{text}</blockquote>
        <p className="attribution">
          {meta.name} ({meta.abbreviation}). Public domain.
        </p>
        <div className="actions">
          <Link href={`${chapterHref}#${book.code}.${chapter.n}.${n}`} className="btn btn--primary">
            Read {chapterName(book)} {chapter.n}
          </Link>
          <CopyVerseButton text={text} reference={ref} versionAbbr={version.abbreviation} />
          <ShareVerseButton text={text} reference={ref} versionAbbr={version.abbreviation} path={path} />
          <VerseImageMaker path={path} reference={ref} />
        </div>
      </section>

      {prev || next ? (
        <section className="section" aria-labelledby="ctx">
          <h2 id="ctx" className="eyebrow">
            In context
          </h2>
          <p className="context">
            {prev ? (
              <>
                <sup className="vn">{prev[0]}</sup>
                {prev[1]}{" "}
              </>
            ) : null}
            <strong>
              <sup className="vn">{n}</sup>
              {text}
            </strong>
            {next ? (
              <>
                {" "}
                <sup className="vn">{next[0]}</sup>
                {next[1]}
              </>
            ) : null}
          </p>
        </section>
      ) : null}

      {others.length ? (
        <section className="section" aria-labelledby="ver">
          <h2 id="ver" className="eyebrow">
            {ref} in other versions
          </h2>
          <ul className="version-list">
            {others.map((o) => (
              <li key={o.version.id}>
                <Link href={versePath(o.version.id, book.slug, chapter.n, n)}>
                  <span className="abbr">{o.version.abbreviation}</span>
                  <span className="text">{o.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {notes.length ? (
        <section className="section" aria-labelledby="notes">
          <h2 id="notes" className="eyebrow">
            Footnotes
          </h2>
          <ul className="note-list">
            {notes.map((note, i) => (
              <li key={i}>{note.text}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav aria-label="Verses" className="pager">
        {prev ? (
          <Link href={versePath(version.id, book.slug, chapter.n, prev[0])} rel="prev">
            ← {chapterName(book)} {chapter.n}:{prev[0]}
          </Link>
        ) : prevCh ? (
          <Link href={chapterPath(version.id, prevCh.book.slug, prevCh.chapter)}>
            ← {chapterName(prevCh.book)} {prevCh.chapter}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={versePath(version.id, book.slug, chapter.n, next[0])} rel="next">
            {chapterName(book)} {chapter.n}:{next[0]} →
          </Link>
        ) : nextCh ? (
          <Link href={chapterPath(version.id, nextCh.book.slug, nextCh.chapter)}>
            {chapterName(nextCh.book)} {nextCh.chapter} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
