import type { Metadata } from "next";
import Link from "next/link";
import { withDivineName } from "@/components/DivineName";
import { SearchIcon } from "@/components/Icons";
import { chapterName } from "@/lib/books";
import { Suspense } from "react";
import { normalise, searchVerses } from "@/lib/search";
import { versePath } from "@/lib/site";
import { DEFAULT_VERSION } from "@/lib/versions";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

/** Wrap each query word in <mark>, ignoring case and punctuation differences. */
function highlight(text: string, query: string) {
  const words = normalise(query).trim().split(" ").filter((w) => w.length > 1);
  if (!words.length) return withDivineName(text);
  const re = new RegExp(`\\b(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : <span key={i}>{withDivineName(part, `h${i}`)}</span>));
}

function SearchForm({ q = "" }: { q?: string }) {
  return (
    <form className="search search-page-form" action="/go" method="get" role="search">
      <SearchIcon />
      <label htmlFor="search-q" className="sr-only">
        Search the Bible
      </label>
      <input
        id="search-q"
        name="q"
        type="search"
        defaultValue={q}
        placeholder="A reference like “jn 3 16”, or words"
        autoComplete="off"
        enterKeyHint="search"
        autoFocus={!q}
      />
    </form>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim();
  if (!q)
    return (
      <>
        <SearchForm />
        <p>Type a reference like “John 3:16” or words like “do not be anxious”.</p>
      </>
    );
  const { total, hits } = await searchVerses(DEFAULT_VERSION, q);
  return (
    <>
      <SearchForm q={q} />
      <h1 className="index-title" style={{ fontSize: 28 }}>
        {total ? `${total.toLocaleString("en-GB")} ${total === 1 ? "verse" : "verses"}` : "No verses found"} for “{q}”
      </h1>
      {total === 0 ? <p>Try fewer words, or check the spelling. You can also type a reference such as “Ps 23”.</p> : null}
      <ol className="results">
        {hits.map((h) => (
          <li key={`${h.book.code}.${h.chapter}.${h.verse}`}>
            <Link href={versePath(DEFAULT_VERSION, h.book.slug, h.chapter, h.verse)}>
              <span className="ref">
                {chapterName(h.book)} {h.chapter}:{h.verse}
              </span>
              <span className="text">{highlight(h.text, q)}</span>
            </Link>
          </li>
        ))}
      </ol>
      {total > hits.length ? <p className="copyright">Showing the first {hits.length}. Add words to narrow it down.</p> : null}
    </>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <main id="content" className="page" style={{ gap: 16 }}>
      <Suspense fallback={<SearchForm />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
