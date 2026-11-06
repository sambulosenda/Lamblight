import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookFilter } from "@/components/BookFilter";
import { BOOK_GROUPS } from "@/lib/books";
import { chapterPath } from "@/lib/site";
import { AVAILABLE_VERSIONS, versionById } from "@/lib/versions";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return AVAILABLE_VERSIONS.map((v) => ({ version: v.id }));
}

async function resolve(params: Promise<{ version: string }>) {
  const version = versionById((await params).version);
  if (!version?.available || version.source !== "self-hosted") notFound();
  return version;
}

export async function generateMetadata({ params }: PageProps<"/[version]">): Promise<Metadata> {
  const version = await resolve(params);
  return {
    title: `The ${version.name} (${version.abbreviation}): all 66 books`,
    description: `Read the ${version.name} online, free and without ads. Choose any book of the Old or New Testament.`,
    alternates: { canonical: `/${version.id}` },
  };
}

export default async function VersionPage({ params }: PageProps<"/[version]">) {
  const version = await resolve(params);
  return (
    <main id="content" className="page">
      <div className="index-head">
        <div>
          <h1 className="index-title">The Bible</h1>
          <p className="index-sub">66 books in the {version.name}</p>
        </div>
        <BookFilter targetId="all-books" />
      </div>
      <div id="all-books" style={{ display: "flex", flexDirection: "column", gap: 48 }}>
        {(["OT", "NT"] as const).map((t) => (
          <section key={t} className="testament" aria-labelledby={`t-${t}`}>
            <h2 id={`t-${t}`}>{t === "OT" ? "Old Testament" : "New Testament"}</h2>
            <div className="book-groups">
              {BOOK_GROUPS.filter((g) => g.testament === t).map((g) => (
                <div key={g.name} className="book-group">
                  <h3>{g.name}</h3>
                  <ul>
                    {g.books.map((b) => (
                      <li key={b.code} data-book={[b.name, ...b.aliases].join("|").toLowerCase().replace(/\s+/g, "")}>
                        <Link className="bk" href={b.chapters === 1 ? chapterPath(version.id, b.slug, 1) : `/${version.id}/${b.slug}`}>
                          <span>{b.name}</span>
                          <span className="ct" aria-label={`${b.chapters} ${b.chapters === 1 ? "chapter" : "chapters"}`}>
                            {b.chapters}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
