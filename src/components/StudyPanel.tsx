"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { withDivineName } from "./DivineName";
import type { StudyData } from "@/lib/study";
import { migrateLegacyNotes, updateMark, useMarks } from "@/lib/marks";

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
  /** The verse's plain text, kept with a note so My notes can show it. */
  text: string;
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

export function StudyPanel({ reference, bookName, verseRef, verseNumber, noteKey, text, lang, data, versions }: Props) {
  const [word, setWord] = useState(() => defaultWord(data));
  const [tab, setTab] = useState<Tab>("words");
  const [interlinear, setInterlinear] = useState(false);
  const base = useId();
  const marks = useMarks();
  const note = marks[noteKey]?.note ?? "";
  const [saved, setSaved] = useState<boolean | null>(null);
  useEffect(() => migrateLegacyNotes((id) => (id === noteKey ? text : undefined)), [noteKey, text]);

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
    setSaved(updateMark(noteKey, { text, version: "bsb" }, { note: value }));
  }

  return (
    <>
      <div className="study-verse-bar">
        <button type="button" className="chip" aria-pressed={interlinear} onClick={() => setInterlinear(!interlinear)}>
          Interlinear
        </button>
      </div>
      <p className={interlinear ? "study-verse study-verse--interlinear" : "study-verse"} id={noteKey}>
        <sup className="vn">{verseNumber}</sup>
        {data.verse.e.map((s, i) => {
          const sep = i > 0 && !/^[,.;:!?’”)\]]/.test(s[0]) ? " " : "";
          if (s.length === 1)
            return interlinear ? (
              <span key={i} className="il il--plain">
                <span className="il__en">{withDivineName(s[0], `s${i}`)}</span>
              </span>
            ) : (
              <span key={i}>
                {sep}
                {withDivineName(s[0], `s${i}`)}
              </span>
            );
          const o = data.verse.o[s[1]];
          const button = (
            <button
              type="button"
              className="study-word"
              aria-pressed={word === i}
              aria-label={o ? `${s[0]}: ${o[0]}, ${o[3]}` : s[0]}
              onClick={() => choose(i)}
            >
              {withDivineName(s[0], `w${i}`)}
            </button>
          );
          return interlinear ? (
            <span key={i} className="il">
              <span className="il__en">{button}</span>
              {o ? (
                <>
                  <span className="il__orig" aria-hidden="true">
                    {original(o[0])}
                  </span>
                  <span className="il__key" aria-hidden="true">
                    {o[3]}
                  </span>
                </>
              ) : null}
            </span>
          ) : (
            <span key={i}>
              {sep}
              {button}
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
                  {data.uses[orig[3]] ? (
                    <p className="lex__uses">
                      Used in {data.uses[orig[3]] === 1 ? "only this verse" : `${data.uses[orig[3]].toLocaleString("en-GB")} verses`} of the {hebrew ? "Old" : "New"} Testament
                    </p>
                  ) : null}
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
                {saved === false ? "This browser isn’t letting Lamplight save notes." : saved ? "Saved on this device. It’s in My notes too." : "Notes stay on this device, in My notes."}
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
