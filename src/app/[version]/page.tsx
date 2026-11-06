import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BOOKS } from "@/lib/books";
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
      <div>
        <p className="reader__book">{version.name}</p>
        <h1 className="index-title">The Bible</h1>
      </div>
      {(["OT", "NT"] as const).map((t) => (
        <section key={t} className="testament" aria-labelledby={`t-${t}`}>
          <h2 id={`t-${t}`} className="eyebrow">
            {t === "OT" ? "Old Testament" : "New Testament"}
          </h2>
          <ul className="book-list">
            {BOOKS.filter((b) => b.testament === t).map((b) => (
              <li key={b.code}>
                <Link href={b.chapters === 1 ? chapterPath(version.id, b.slug, 1) : `/${version.id}/${b.slug}`}>{b.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
