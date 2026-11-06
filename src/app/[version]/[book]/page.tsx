import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookChapters } from "@/components/BookChapters";
import { BOOK_GROUPS, BOOKS, bookBySlug, chapterName } from "@/lib/books";
import { breadcrumbs, JsonLd } from "@/lib/jsonld";
import { AVAILABLE_VERSIONS, versionById } from "@/lib/versions";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return AVAILABLE_VERSIONS.flatMap((v) => BOOKS.map((b) => ({ version: v.id, book: b.slug })));
}

async function resolve(params: Promise<{ version: string; book: string }>) {
  const p = await params;
  const version = versionById(p.version);
  const book = bookBySlug(p.book);
  if (!version?.available || version.source !== "self-hosted" || !book) notFound();
  return { version, book };
}

export async function generateMetadata({ params }: PageProps<"/[version]/[book]">): Promise<Metadata> {
  const { version, book } = await resolve(params);
  return {
    title: `${book.name} ${version.abbreviation}: all ${book.chapters} ${book.chapters === 1 ? "chapter" : "chapters"}`,
    description: `Read ${book.title} in the ${version.name}, free and without ads.`,
    alternates: { canonical: `/${version.id}/${book.slug}` },
  };
}

export default async function BookPage({ params }: PageProps<"/[version]/[book]">) {
  const { version, book } = await resolve(params);
  const group = BOOK_GROUPS.find((g) => g.books.includes(book));
  // "The Gospel of John" → small-caps "The Gospel of" over a large "John".
  const prefix = book.title !== book.name && book.title.endsWith(` ${book.name}`) ? book.title.slice(0, -book.name.length - 1) : "";
  const name = prefix ? book.name : book.title;
  return (
    <main id="content" className="page">
      <JsonLd
        data={breadcrumbs([
          { name: version.abbreviation, path: `/${version.id}` },
          { name: book.name, path: `/${version.id}/${book.slug}` },
        ])}
      />
      <div className="running-head running-head--page">
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <ol>
            <li>
              <Link href={`/${version.id}`}>Contents</Link>
            </li>
            <li aria-current="page">{book.name}</li>
          </ol>
        </nav>
        {group ? <span>{group.name}</span> : null}
      </div>
      <header className="book-head">
        {prefix ? <p className="book-head__pre">{prefix}</p> : null}
        <h1 className="book-head__name">
          {prefix ? <span className="sr-only">{prefix} </span> : null}
          {name}
        </h1>
        <p className="index-sub">
          {book.chapters} {book.chapters === 1 ? "chapter" : "chapters"}
          {group ? ` · ${group.name}, ${book.testament === "OT" ? "Old" : "New"} Testament` : ""}
          {` · ${version.name}`}
        </p>
      </header>
      <BookChapters base={`/${version.id}/${book.slug}`} chapters={book.chapters} chapterLabel={chapterName(book)} />
    </main>
  );
}
