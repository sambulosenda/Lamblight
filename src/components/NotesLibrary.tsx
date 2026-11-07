"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { withDivineName } from "./DivineName";
import { NoteSheet } from "./NoteSheet";
import { SearchIcon } from "./Icons";
import { BOOKS, bookIndex } from "@/lib/books";
import { COLOURS, migrateLegacyNotes, parseVerseId, useColourNames, useHydrated, useMarks, verseHref, verseLabel, type Colour, type Mark } from "@/lib/marks";
import { versionById } from "@/lib/versions";

type Sort = "newest" | "bible";

function bibleOrder(id: string): number {
  const k = parseVerseId(id);
  return k ? bookIndex(k.code) * 1e6 + k.chapter * 1e3 + k.verse : Infinity;
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" });
function when(ts: number): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(new Date()) - day(new Date(ts))) / 86400000);
  return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : dateFmt.format(ts);
}

/** Markdown export, newest first, in the reader's own colour names. */
function toMarkdown(items: [string, Mark][], names: Record<Colour, string>): string {
  const lines = ["# My highlights and notes", "", `Exported from Lamplight on ${dateFmt.format(Date.now())}.`, ""];
  for (const [id, m] of items) {
    const abbr = versionById(m.version)?.abbreviation ?? m.version.toUpperCase();
    lines.push(`## ${verseLabel(id)} (${abbr})`, "");
    if (m.text) lines.push(`> ${m.text}`, "");
    if (m.note?.trim()) lines.push(m.note.trim(), "");
    const meta = [m.colour ? names[m.colour] : null, ...(m.tags ?? [])].filter(Boolean);
    if (meta.length) lines.push(`_${meta.join(" · ")}_`, "");
  }
  return lines.join("\n");
}

/**
 * "Your margin": every highlight and note on this device, filtered by colour,
 * book or tag, searchable, and exportable as Markdown.
 */
export function NotesLibrary() {
  const base = useId();
  const hydrated = useHydrated();
  const marks = useMarks();
  const names = useColourNames();
  const [colour, setColour] = useState<Colour | null>(null);
  const [book, setBook] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => migrateLegacyNotes(), []);

  const all = useMemo(() => Object.entries(marks), [marks]);
  const byColour = (c: Colour) => all.filter(([, m]) => m.colour === c).length;
  const books = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [id] of all) {
      const code = parseVerseId(id)?.code;
      if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    return BOOKS.filter((b) => counts.has(b.code)).map((b) => ({ book: b, count: counts.get(b.code)! }));
  }, [all]);
  const tags = useMemo(() => [...new Set(all.flatMap(([, m]) => m.tags ?? []))].sort((a, b) => a.localeCompare(b)), [all]);

  const q = query.trim().toLowerCase();
  const shown = all
    .filter(([id, m]) => {
      if (colour && m.colour !== colour) return false;
      if (book && parseVerseId(id)?.code !== book) return false;
      if (tag && !m.tags?.includes(tag)) return false;
      if (q && ![verseLabel(id), m.text, m.note ?? "", ...(m.tags ?? [])].some((s) => s.toLowerCase().includes(q))) return false;
      return true;
    })
    .sort(([a, ma], [b, mb]) => (sort === "newest" ? mb.updated - ma.updated : bibleOrder(a) - bibleOrder(b)));

  const exportMarkdown = () => {
    const blob = new Blob([toMarkdown(shown, names)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lamplight-notes-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const filtered = colour || book || tag || q;
  const editingMark = editing ? marks[editing] : undefined;

  return (
    <div className="notes">
      <aside className="notes__filters" aria-label="Filter your notes">
        <div>
          <h2 className="notes__h">By colour</h2>
          <button type="button" className="notes__f" aria-pressed={!colour} onClick={() => setColour(null)}>
            All marks<b>{all.length}</b>
          </button>
          {COLOURS.map((c) => (
            <button key={c} type="button" className="notes__f" aria-pressed={colour === c} onClick={() => setColour(colour === c ? null : c)}>
              <span className="dot" data-colour={c} aria-hidden="true" />
              {names[c]}
              <b>{byColour(c)}</b>
            </button>
          ))}
        </div>
        {books.length ? (
          <div>
            <h2 className="notes__h">By book</h2>
            {books.map(({ book: b, count }) => (
              <button key={b.code} type="button" className="notes__f" aria-pressed={book === b.code} onClick={() => setBook(book === b.code ? null : b.code)}>
                {b.name}
                <b>{count}</b>
              </button>
            ))}
            {book ? (
              <button type="button" className="notes__f" onClick={() => setBook(null)}>
                All books
              </button>
            ) : null}
          </div>
        ) : null}
        {tags.length ? (
          <div>
            <h2 className="notes__h">Tags</h2>
            <p className="notes__tags">
              {tags.map((t) => (
                <button key={t} type="button" className="tag" aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                  {t}
                </button>
              ))}
            </p>
          </div>
        ) : null}
      </aside>

      <section className="notes__main" aria-labelledby={`${base}-title`}>
        <div className="notes__head">
          <div>
            <p className="smallcaps-head notes__kicker">Your margin</p>
            <h1 id={`${base}-title`} className="notes__title">
              Highlights and notes
            </h1>
          </div>
          <div className="notes__tools">
            <div className="find-book notes__search">
              <SearchIcon size={16} />
              <label htmlFor={`${base}-q`} className="sr-only">
                Search your notes
              </label>
              <input id={`${base}-q`} type="search" placeholder="Search your notes" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <button type="button" className="btn" onClick={exportMarkdown} disabled={!shown.length}>
              Export
            </button>
          </div>
        </div>
        <p className="notes__sort">
          <button type="button" className="link-btn" aria-pressed={sort === "newest"} onClick={() => setSort("newest")}>
            Newest first
          </button>
          <span aria-hidden="true"> · </span>
          <button type="button" className="link-btn" aria-pressed={sort === "bible"} onClick={() => setSort("bible")}>
            Bible order
          </button>
          <span className="notes__private">Kept on this device. Only you can see them.</span>
        </p>

        {!hydrated ? null : !all.length ? (
          <div className="notes__empty">
            <p className="h2-serif">Nothing in your margin yet</p>
            <p>
              While reading, tap a verse, then choose a colour or <strong>Note</strong>. Everything you mark shows up here, on this device.
            </p>
            <Link href="/bsb/john/3" className="btn btn--primary">
              Read John 3
            </Link>
          </div>
        ) : !shown.length ? (
          <p className="notes__none">{filtered ? "Nothing matches. Try another filter." : "Nothing here."}</p>
        ) : (
          <ol className="notes__list">
            {shown.map(([id, m]) => (
              <li key={id} className="note-item">
                <span className="note-item__bar" data-colour={m.colour ?? "none"} aria-hidden="true" />
                <div>
                  <Link className="note-item__ref" href={verseHref(id, m.version)}>
                    {verseLabel(id)}
                  </Link>
                  {m.text ? <p className="note-item__text">{withDivineName(m.text)}</p> : null}
                  {m.note?.trim() ? <p className="note-item__note">{m.note}</p> : null}
                  <p className="note-item__meta">
                    {[when(m.updated), m.colour ? names[m.colour] : null, ...(m.tags ?? []), versionById(m.version)?.abbreviation].filter(Boolean).join(" · ")} ·{" "}
                    <button type="button" className="link-btn" onClick={() => setEditing(id)}>
                      Edit
                    </button>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {editing ? (
        <NoteSheet
          id={editing}
          reference={verseLabel(editing)}
          text={editingMark?.text ?? ""}
          version={editingMark?.version ?? "bsb"}
          open
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

