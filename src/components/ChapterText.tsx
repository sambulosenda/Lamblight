import { Fragment, type ReactNode } from "react";
import { withDivineName } from "./DivineName";
import { LampIcon } from "./Logo";
import { HEADING_BLOCKS, POETRY_BLOCKS, verseId, type Block, type Chapter, type Inline } from "@/lib/scripture";

/** Footnote call labels: a, b, ... z, aa, ab ... */
export function noteLabel(i: number): string {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

function renderInline(item: Inline, key: string): ReactNode {
  if (typeof item === "string") return <Fragment key={key}>{withDivineName(item, key)}</Fragment>;
  if ("nd" in item) {
    return (
      <span key={key} className="nd">
        {item.nd}
      </span>
    );
  }
  if ("f" in item) {
    const label = noteLabel(item.f);
    return (
      <a key={key} href={`#fn-${item.f + 1}`} id={`fnref-${item.f + 1}`} className="fn-call" aria-label={`Footnote ${label}`}>
        {label}
      </a>
    );
  }
  return null;
}

/**
 * Split a block's content into runs that belong to one verse each, so every verse
 * is a <span class="verse" data-v="16"> even when a verse spans several paragraphs
 * or poetry lines. The first run of each verse gets the canonical ID (JHN.3.16) for
 * deep links.
 */
function renderBlock(
  block: Block,
  bookCode: string,
  chapter: number,
  state: { verse: number; seen: Set<number> },
  key: number,
  numeral = false,
) {
  if (block.t === "b") return <div key={key} className="b" aria-hidden="true" />;
  // Poetry lines can't wrap around a dropped numeral, so it stands on its own line.
  if (numeral && POETRY_BLOCKS.has(block.t)) {
    return (
      <Fragment key={key}>
        <div className="chapter-num chapter-num--block" aria-hidden="true">
          {chapter}
        </div>
        {renderBlock(block, bookCode, chapter, state, key)}
      </Fragment>
    );
  }

  const runs: { verse: number; items: Inline[] }[] = [];
  for (const item of block.c) {
    if (typeof item === "object" && "v" in item) {
      state.verse = item.v;
      runs.push({ verse: item.v, items: [] });
      continue;
    }
    const last = runs[runs.length - 1];
    if (last) last.items.push(item);
    else runs.push({ verse: state.verse, items: [item] });
  }

  const isHeading = HEADING_BLOCKS.has(block.t);
  const children = runs.map((run, i) => {
    const content = run.items.map((it, j) => renderInline(it, `${key}-${i}-${j}`));
    if (isHeading || run.verse === 0) return <Fragment key={i}>{content}</Fragment>;
    const first = !state.seen.has(run.verse);
    state.seen.add(run.verse);
    const startsHere = block.c.some((it) => typeof it === "object" && "v" in it && it.v === run.verse);
    return (
      <span key={i} className="verse" data-v={run.verse} id={first ? verseId(bookCode, chapter, run.verse) : undefined}>
        {first && startsHere ? <sup className="vn">{run.verse}</sup> : null}
        {content}
      </span>
    );
  });

  switch (block.t) {
    case "s1":
    case "s2":
      return (
        <h2 key={key} className={block.t}>
          {children}
        </h2>
      );
    case "qa":
      return (
        <h3 key={key} className="qa">
          {children}
        </h3>
      );
    default:
      return (
        <p key={key} className={numeral ? `${block.t} has-numeral` : block.t}>
          {numeral ? (
            <span className="chapter-num" aria-hidden="true">
              {chapter}
            </span>
          ) : null}
          {children}
        </p>
      );
  }
}

/**
 * The chapter text. Like a printed Bible, the chapter number is set as a large
 * rubric numeral at the start of the first paragraph of Scripture.
 */
export function ChapterText({ chapter, bookCode }: { chapter: Chapter; bookCode: string }) {
  const state = { verse: 0, seen: new Set<number>() };
  const numeralAt = chapter.blocks.findIndex(
    (bl) => bl.t !== "b" && !HEADING_BLOCKS.has(bl.t) && bl.c.some((it) => typeof it === "object" && "v" in it),
  );
  if (bookCode === "PSA") {
    // A psalm opens with its own head (word, numeral, ornament) instead of a dropped numeral.
    return (
      <>
        <div className="psalm-head" aria-hidden="true">
          <span className="psalm-head__word">Psalm</span>
          <span className="psalm-head__num">{chapter.n}</span>
          <span className="psalm-head__orn">
            <span />
            <LampIcon size={18} />
            <span />
          </span>
        </div>
        {chapter.blocks.map((block, i) => renderBlock(block, bookCode, chapter.n, state, i))}
      </>
    );
  }
  return <>{chapter.blocks.map((block, i) => renderBlock(block, bookCode, chapter.n, state, i, i === numeralAt))}</>;
}

/** The five books of the Psalter. */
export function psalterBook(n: number): string {
  if (n <= 41) return "Book One";
  if (n <= 72) return "Book Two";
  if (n <= 89) return "Book Three";
  if (n <= 106) return "Book Four";
  return "Book Five";
}

export function Footnotes({ chapter }: { chapter: Chapter }) {
  if (chapter.notes.length === 0) return null;
  return (
    <section className="footnotes" aria-labelledby="footnotes-title">
      <h2 id="footnotes-title" className="section-title">
        Footnotes
      </h2>
      <ol type="a">
        {chapter.notes.map((note, i) => (
          <li key={i} id={`fn-${i + 1}`}>
            <span className="ref">{note.ref}</span>
            {note.text} <a href={`#fnref-${i + 1}`} aria-label={`Back to verse ${note.ref}`}>↩</a>
          </li>
        ))}
      </ol>
    </section>
  );
}
