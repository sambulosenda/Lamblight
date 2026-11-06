import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BOOKS, bookBySlug, chapterName } from "@/lib/books";
import { breadcrumbs, JsonLd } from "@/lib/jsonld";
import { chapterPath } from "@/lib/site";
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
  return (
    <main id="content" className="page">
      <JsonLd
        data={breadcrumbs([
          { name: version.abbreviation, path: `/${version.id}` },
          { name: book.name, path: `/${version.id}/${book.slug}` },
        ])}
      />
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <ol>
          <li>
            <Link href={`/${version.id}`}>Bible</Link>
          </li>
          <li aria-current="page">{book.name}</li>
        </ol>
      </nav>
      <div>
        <p className="reader__book">{version.name}</p>
        <h1 className="index-title">{book.title}</h1>
      </div>
      <ul className="chapter-grid" aria-label="Chapters">
        {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => (
          <li key={n}>
            <Link href={chapterPath(version.id, book.slug, n)} aria-label={`${chapterName(book)} ${n}`}>
              {n}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
