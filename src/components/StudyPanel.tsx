"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { withDivineName } from "./DivineName";
import type { StudyData } from "@/lib/study";

type Tab = "words" | "refs" | "versions" | "notes";
const TABS: { id: Tab; label: string }[] = [
  { id: "words", label: "Words" },
  { id: "refs", label: "Cross refs" },
  { id: "versions", label: "Versions" },
  { id: "notes", label: "My notes" },
];

interface Props {
  reference: string;
  bookName: string;
  verseRef: string;
  verseNumber: number;
  noteKey: string;
  lang: "grc" | "hbo";
  data: StudyData;
  /** The same verse in the other versions on the site. */
  versions: { abbreviation: string; name: string; href: string; text: string }[];
}

/** The first verb, else noun, else any linked word: a better starting word than “For”. */
function defaultWord(data: StudyData): number {
  const linked = data.verse.e.flatMap((s, i) => (s.length === 2 ? [i] : []));
  const by = (prefix: string) => linked.find((i) => data.verse.o[data.verse.e[i][1] as number]?.[2].startsWith(prefix));
  return by("V-") ?? by("N-") ?? linked[0] ?? -1;
}

const noop = () => () => {};

function readNote(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function StudyPanel({ reference, bookName, verseRef, verseNumber, noteKey, lang, data, versions }: Props) {
  const [word, setWord] = useState(() => defaultWord(data));
  const [tab, setTab] = useState<Tab>("words");
  const base = useId();
  const storageKey = `lamplight:note:${noteKey}`;
  const stored = useSyncExternalStore(noop, () => readNote(storageKey), () => "");
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const note = draft ?? stored;

  const seg = word >= 0 ? data.verse.e[word] : undefined;
  const orig = seg && seg.length === 2 ? data.verse.o[seg[1]] : undefined;
  const hebrew = lang === "hbo";
  const original = (text: string) => (
    <span lang={lang} dir={hebrew ? "rtl" : undefined} className={hebrew ? "orig orig--hebrew" : "orig orig--greek"}>
      {text}
    </span>
  );

  function choose(i: number) {
    setWord(i);
    setTab("words");
  }

  function saveNote(value: string) {
    setDraft(value);
    setSaved(false);
    try {
      if (value.trim()) localStorage.setItem(storageKey, value);
      else localStorage.removeItem(storageKey);
      setSaved(true);
    } catch {
      /* storage unavailable: keep the draft in memory */
    }
  }

  return (
    <>
      <p className="study-verse" id={noteKey}>
        <sup className="vn">{verseNumber}</sup>
        {data.verse.e.map((s, i) => {
          const sep = i > 0 && !/^[,.;:!?’”)\]]/.test(s[0]) ? " " : "";
          if (s.length === 1)
            return (
              <span key={i}>
                {sep}
                {withDivineName(s[0], `s${i}`)}
              </span>
            );
          const o = data.verse.o[s[1]];
          return (
            <span key={i}>
              {sep}
              <button
                type="button"
                className="study-word"
                aria-pressed={word === i}
                aria-label={o ? `${s[0]}: ${o[0]}, ${o[3]}` : s[0]}
                onClick={() => choose(i)}
              >
                {withDivineName(s[0], `w${i}`)}
              </button>
            </span>
          );
        })}
      </p>

      <aside className="study-panel" aria-label={`Study ${reference}`}>
        <h2 className="study-panel__ref">
          {bookName} <span className="rubric">{verseRef}</span>
        </h2>
        <div role="tablist" aria-label="Study tools" className="study-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${base}-${t.id}-tab`}
              aria-controls={`${base}-${t.id}`}
              aria-selected={tab === t.id}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                const at = TABS.findIndex((x) => x.id === tab);
                const nextTab = TABS[(at + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length].id;
                setTab(nextTab);
                document.getElementById(`${base}-${nextTab}-tab`)?.focus();
              }}
            >
              {t.label}
              {t.id === "refs" && data.crossRefs.length ? <span className="study-tabs__count"> {data.crossRefs.length}</span> : null}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`${base}-${tab}`} aria-labelledby={`${base}-${tab}-tab`} className="study-tabpanel">
          {tab === "words" ? (
            <>
              {orig && seg ? (
                <div className="lex" aria-live="polite">
                  <p className="lex__english">“{withDivineName(seg[0].replace(/[,.;:!?]+$/, ""), "lx")}”</p>
                  <p className="lex__form">{original(orig[0])}</p>
                  <p className="lex__meta">
                    <span className="lex__key">{orig[3].replace(/^([GH])/, "$1 ")}</span>
                    <span className="lex__translit">{orig[1]}</span>
                    <span className="lex__morph">{orig[2]}</span>
                  </p>
                  {data.lexicon[orig[3]] ? <p className="lex__def">{data.lexicon[orig[3]]}</p> : null}
                </div>
              ) : (
                <p className="study-empty">Choose an underlined word to see the {hebrew ? "Hebrew" : "Greek"} behind it.</p>
              )}
              <h3 className="study-sub">Every word in this verse</h3>
              <ol className="lex-list">
                {data.verse.e.map((s, i) =>
                  s.length === 2 && data.verse.o[s[1]] ? (
                    <li key={i}>
                      <button type="button" aria-pressed={word === i} onClick={() => choose(i)}>
                        <span className="lex-list__en">{withDivineName(s[0].replace(/[,.;:!?]+$/, ""), `l${i}`)}</span>
                        {original(data.verse.o[s[1]][0])}
                        <span className="lex-list__key">{data.verse.o[s[1]][3]}</span>
                      </button>
                    </li>
                  ) : null,
                )}
              </ol>
            </>
          ) : null}

          {tab === "refs" ? (
            data.crossRefs.length ? (
              <>
                <ul className="xrefs">
                  {data.crossRefs.map((x) => (
                    <li key={x.id}>
                      <Link href={x.href}>{x.ref}</Link>
                      <p>{withDivineName(x.text, x.id)}</p>
                    </li>
                  ))}
                </ul>
                <p className="study-credit">
                  Cross references from <a href="https://www.openbible.info/labs/cross-references/">OpenBible.info</a>, CC BY.
                </p>
              </>
            ) : (
              <p className="study-empty">No cross references for this verse yet.</p>
            )
          ) : null}

          {tab === "versions" ? (
            versions.length ? (
              <ul className="version-list">
                {versions.map((v) => (
                  <li key={v.abbreviation}>
                    <Link href={v.href}>
                      <span className="abbr" title={v.name}>
                        {v.abbreviation}
                      </span>
                      <span className="text">{withDivineName(v.text, v.abbreviation)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="study-empty">This verse isn’t in the other versions on Lamplight.</p>
            )
          ) : null}

          {tab === "notes" ? (
            <div className="study-notes">
              <label htmlFor={`${base}-note`} className="study-sub">
                Your note on {reference}
              </label>
              <textarea
                id={`${base}-note`}
                rows={7}
                value={note}
                onChange={(e) => saveNote(e.target.value)}
                placeholder="What stands out to you?"
              />
              <p className="study-credit" aria-live="polite">
                {saved ? "Saved on this device." : "Notes stay on this device."}
              </p>
            </div>
          ) : null}
        </div>

        <p className="study-credit study-credit--foot">
          {hebrew ? "Hebrew" : "Greek"} and Strong’s data from the Berean Bible (berean-build), Apache 2.0.
        </p>
      </aside>
    </>
  );
}
