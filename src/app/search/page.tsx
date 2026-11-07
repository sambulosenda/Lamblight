import type { Metadata } from "next";
import Link from "next/link";
import { withDivineName } from "@/components/DivineName";
import { SearchIcon } from "@/components/Icons";
import { chapterName } from "@/lib/books";
import { Suspense } from "react";
import { normalise, searchVerses, type SearchSpread } from "@/lib/search";
import { topicForQuery, topicPhrase } from "@/lib/topics";
import { BookIcon } from "@/components/Icons";
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

type Filter = "all" | "OT" | "NT";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Whole Bible" },
  { id: "OT", label: "Old Testament" },
  { id: "NT", label: "New Testament" },
];

function Filters({ q, current }: { q: string; current: Filter }) {
  return (
    <nav aria-label="Search in" className="search-filters">
      {FILTERS.map((f) => (
        <Link
          key={f.id}
          href={`/search?q=${encodeURIComponent(q)}${f.id === "all" ? "" : `&t=${f.id.toLowerCase()}`}`}
          aria-current={current === f.id ? "page" : undefined}
          className="search-filters__f"
        >
          {f.label}
        </Link>
      ))}
    </nav>
  );
}

/** A split bar: how the matches fall between the Old and New Testaments, and the top book in each. */
function Spread({ spread }: { spread: SearchSpread }) {
  const total = spread.OT + spread.NT;
  if (!total) return null;
  const side = (t: "OT" | "NT") => {
    const top = t === "OT" ? spread.topOT : spread.topNT;
    return `${t === "OT" ? "Old" : "New"} Testament ${spread[t].toLocaleString("en-GB")}${top && spread[t] > 1 ? ` · ${top.book.name} ${top.count}` : ""}`;
  };
  return (
    <div className="spread" role="img" aria-label={`Where the matches are: ${spread.OT} in the Old Testament, ${spread.NT} in the New`}>
      <div className="spread__bar" style={{ gridTemplateColumns: `${spread.OT}fr ${spread.NT}fr` }}>
        {spread.OT ? <span className="spread__ot" /> : null}
        {spread.NT ? <span className="spread__nt" /> : null}
      </div>
      <p className="spread__legend" aria-hidden="true">
        <span>{side("OT")}</span>
        <span>{side("NT")}</span>
      </p>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const params = await searchParams;
  const raw = params.q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim();
  const t = String(Array.isArray(params.t) ? params.t[0] : params.t ?? "").toUpperCase();
  const filter: Filter = t === "OT" || t === "NT" ? t : "all";
  if (!q)
    return (
      <>
        <SearchForm />
        <p>Type a reference like “John 3:16” or words like “do not be anxious”.</p>
      </>
    );
  // "bible verses about forgiving" searches the verses for "forgiving".
  const words = topicPhrase(q) ?? q;
  const { total, hits, spread } = await searchVerses(DEFAULT_VERSION, words, 50, filter === "all" ? undefined : filter);
  const topic = topicForQuery(words);
  const everywhere = spread.OT + spread.NT;
  return (
    <>
      <SearchForm q={q} />
      <Filters q={q} current={filter} />
      {topic ? (
        <Link href={`/topics/${topic.slug}`} className="topic-card">
          <span className="topic-card__icon" aria-hidden="true">
            <BookIcon size={22} />
          </span>
          <span className="topic-card__text">
            <span className="topic-card__name">Verses about {topic.phrase}</span>
            <span className="topic-card__intro">{topic.intro}</span>
          </span>
          <span className="topic-card__go" aria-hidden="true">
            ›
          </span>
        </Link>
      ) : null}
      <h1 className="index-title" style={{ fontSize: 28 }}>
        {total ? `${total.toLocaleString("en-GB")} ${total === 1 ? "verse" : "verses"}` : "No verses found"} for “{words}”
        {filter !== "all" ? <span className="index-title__in"> in the {filter === "OT" ? "Old" : "New"} Testament</span> : null}
      </h1>
      <Spread spread={spread} />
      {total === 0 ? (
        <p>
          {everywhere ? (
            <>
              No matches here, but {everywhere.toLocaleString("en-GB")} in the <Link href={`/search?q=${encodeURIComponent(q)}`}>whole Bible</Link>.
            </>
          ) : (
            "Try fewer words, or check the spelling. You can also type a reference such as “Ps 23”."
          )}
        </p>
      ) : null}
      <ol className="results">
        {hits.map((h) => (
          <li key={`${h.book.code}.${h.chapter}.${h.verse}`}>
            <Link href={versePath(DEFAULT_VERSION, h.book.slug, h.chapter, h.verse)}>
              <span className="ref">
                {chapterName(h.book)} {h.chapter}:{h.verse}
              </span>
              <span className="text">{highlight(h.text, words)}</span>
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
