"use client";
import Link from "next/link";
import { DEFAULT_VERSION } from "@/lib/versions";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { VerseImageMaker } from "./VerseImageMaker";
import { NoteSheet } from "./NoteSheet";
import { COLOURS, COLOUR_LABEL, updateMark, useColourNames, useMarks, type Colour } from "@/lib/marks";

interface Props {
  children: ReactNode;
  /** [verse number, plain text] for the chapter. */
  verses: [number, string][];
  bookName: string;
  chapter: number;
  versionAbbr: string;
  /** Version id, e.g. "bsb". */
  versionId: string;
  /** Book code, e.g. "JHN", for canonical verse IDs. */
  bookCode: string;
  /** Chapter URL path, e.g. /bsb/john/3 */
  chapterHref: string;
  /** Verses that have a Study page (Study follows the BSB's verse numbering). */
  studyVerses: number[];
}

/** "16–18, 20" from [16, 17, 18, 20] */
export function compressRanges(nums: number[]): string {
  const parts: string[] = [];
  let start = nums[0];
  let prev = nums[0];
  for (const n of [...nums.slice(1), NaN]) {
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}–${prev}`);
    start = prev = n;
  }
  return parts.join(", ");
}

/**
 * Tap or click verses to select them, then copy or share with the reference and
 * version. Verses are focusable; Enter or Space toggles one, Escape clears.
 */
export function VerseSelect({ children, verses, bookName, chapter, versionAbbr, versionId, bookCode, chapterHref, studyVerses }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<number | null>(null);
  const marks = useMarks();
  const names = useColourNames();
  const texts = new Map(verses);
  const idFor = (v: number) => `${bookCode}.${chapter}.${v}`;

  // Show this device's highlights, and a dot after verses that have a note.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const lastRun = new Map<string, HTMLElement>();
    el.querySelectorAll<HTMLElement>(".verse").forEach((span) => {
      const mark = marks[`${bookCode}.${chapter}.${span.dataset.v}`];
      if (mark?.colour) span.dataset.hl = mark.colour;
      else delete span.dataset.hl;
      delete span.dataset.note;
      if (mark?.note?.trim()) lastRun.set(span.dataset.v!, span);
    });
    lastRun.forEach((span) => (span.dataset.note = ""));
  }, [marks, bookCode, chapter]);

  // Reflect selection in the DOM (aria-selected on every run of a verse).
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    el.querySelectorAll<HTMLElement>(".verse").forEach((span) => {
      const v = Number(span.dataset.v);
      span.setAttribute("aria-selected", selected.includes(v) ? "true" : "false");
    });
  }, [selected]);

  // Make verses reachable by keyboard and remember the last chapter read.
  useEffect(() => {
    root.current?.querySelectorAll<HTMLElement>(".verse[id]").forEach((span) => {
      span.tabIndex = 0;
      span.setAttribute("role", "button");
    });
    try {
      localStorage.setItem("lamplight:last", JSON.stringify({ href: chapterHref, label: `${bookName} ${chapter}` }));
      const read: string[] = JSON.parse(localStorage.getItem("lamplight:read") ?? "[]");
      if (Array.isArray(read) && !read.includes(chapterHref)) localStorage.setItem("lamplight:read", JSON.stringify([...read, chapterHref]));
    } catch {}
  }, [chapterHref, bookName, chapter]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const toggle = useCallback((v: number) => {
    setSelected((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v].sort((a, b) => a - b)));
  }, []);

  const onClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("a")) return; // footnote links
    const span = target.closest<HTMLElement>(".verse");
    if (span?.dataset.v) toggle(Number(span.dataset.v));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setSelected([]);
    const span = (e.target as HTMLElement).closest<HTMLElement>(".verse");
    if (span?.dataset.v && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      toggle(Number(span.dataset.v));
    }
  };

  const reference = selected.length ? `${bookName} ${chapter}:${compressRanges(selected)}` : "";
  const text = selected.map((v) => texts.get(v) ?? "").join(" ");
  const single = selected.length === 1 ? selected[0] : null;
  const shareUrl = () => `${location.origin}${chapterHref}${single ? `/${single}` : ""}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`“${text}”\n${reference} ${versionAbbr}`);
      setToast(`Copied ${reference}`);
      setSelected([]);
    } catch {
      setToast("Couldn’t copy. Try selecting the text instead.");
    }
  };

  const share = async () => {
    const url = shareUrl();
    const data = { title: `${reference} ${versionAbbr}`, text: `“${text}” ${reference} ${versionAbbr}`, url };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(url);
        setToast("Link copied");
      }
      setSelected([]);
    } catch {
      /* share sheet dismissed */
    }
  };

  const highlight = (c: Colour) => {
    // Tapping the colour every selected verse already has takes it off again.
    const off = selected.every((v) => marks[idFor(v)]?.colour === c);
    const ok = selected.every((v) => updateMark(idFor(v), { text: texts.get(v) ?? "", version: versionId }, { colour: off ? undefined : c }));
    setToast(ok ? (off ? `Highlight removed from ${reference}` : `${reference} · ${names[c]}`) : "This browser isn’t letting Lamplight save highlights.");
    setSelected([]);
  };

  const noteVerse = noteFor ?? 0;

  return (
    <>
      {noteFor !== null ? (
        <NoteSheet
          id={idFor(noteVerse)}
          reference={`${bookName} ${chapter}:${noteVerse}`}
          text={texts.get(noteVerse) ?? ""}
          version={versionId}
          open
          onClose={() => {
            setNoteFor(null);
            setSelected([]);
          }}
        />
      ) : null}
      <div ref={root} className="scripture" onClick={onClick} onKeyDown={onKeyDown}>
        {children}
      </div>
      {selected.length > 0 ? (
        <div role="toolbar" aria-label={`Actions for ${reference}`} className="verse-toolbar">
          <span className="verse-toolbar__label">{reference}</span>
          <span className="verse-toolbar__swatches">
            {COLOURS.map((c) => (
              <button
                key={c}
                type="button"
                className="swatch swatch--bar"
                data-colour={c}
                aria-pressed={selected.every((v) => marks[idFor(v)]?.colour === c)}
                aria-label={`Highlight ${COLOUR_LABEL[c].toLowerCase()}, ${names[c]}`}
                title={names[c]}
                onClick={() => highlight(c)}
              >
                <span />
              </button>
            ))}
          </span>
          <button type="button" className="verse-toolbar__close" aria-label="Clear selection" onClick={() => setSelected([])}>
            ✕
          </button>
          <span className="verse-toolbar__actions">
            {single ? (
              <button type="button" onClick={() => setNoteFor(single)}>
                Note
              </button>
            ) : null}
            <button type="button" onClick={copy}>
              Copy
            </button>
            <button type="button" onClick={share}>
              Share
            </button>
            {single && studyVerses.includes(single) ? <Link href={`/${DEFAULT_VERSION}${chapterHref.slice(chapterHref.indexOf("/", 1))}/${single}/study`}>Study</Link> : null}
            {single ? <VerseImageMaker path={`${chapterHref}/${single}`} reference={reference} label="Image" className="" /> : null}
            {single ? <Link href={`${chapterHref}/${single}`}>Open</Link> : null}
          </span>
        </div>
      ) : null}
      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : (
        <div className="sr-only" role="status" />
      )}
    </>
  );
}
