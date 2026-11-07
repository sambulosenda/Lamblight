"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { withDivineName } from "./DivineName";
import { diffWords } from "@/lib/word-diff";

export interface CompareRow {
  verse: number;
  /** Version id → verse text ("" when the verse isn't in that version). */
  texts: Record<string, string>;
}

interface Version {
  id: string;
  abbreviation: string;
  name: string;
}

interface Props {
  rows: CompareRow[];
  versions: Version[];
  bookSlug: string;
  chapter: number;
  studyVerses: number[];
  testament: "OT" | "NT";
}

function Shaded({ text, other, shade, k }: { text: string; other: string | undefined; shade: boolean; k: string }) {
  if (!text) return <span className="compare__missing">Not in this version</span>;
  if (!shade || other === undefined || !other) return <>{withDivineName(text, k)}</>;
  return (
    <>
      {diffWords(text, other).map((p, i) =>
        p.differs ? (
          <span key={i} className="diff">
            {withDivineName(p.text, `${k}-${i}`)}
          </span>
        ) : (
          <span key={i}>{withDivineName(p.text, `${k}-${i}`)}</span>
        ),
      )}
    </>
  );
}

/**
 * Two (or three) versions verse by verse. On wide screens they sit in columns;
 * on phones the second version sits under each verse in a softer tone. Words
 * that differ from the first version are shaded.
 */
export function CompareView({ rows, versions, bookSlug, chapter, studyVerses, testament }: Props) {
  const base = useId();
  const has = (id: string) => versions.some((v) => v.id === id);
  const [left, setLeft] = useState(has("bsb") ? "bsb" : versions[0].id);
  const [right, setRight] = useState(has("kjv") ? "kjv" : (versions[1] ?? versions[0]).id);
  const [third, setThird] = useState<string | null>(null);
  const [shade, setShade] = useState(true);

  const shown = [left, right, ...(third ? [third] : [])];
  const byId = useMemo(() => new Map(versions.map((v) => [v.id, v])), [versions]);
  const spare = versions.find((v) => !shown.includes(v.id));
  const cols = shown.length;

  const picker = (value: string, onChange: (id: string) => void, label: string, onRemove?: () => void) => (
    <div className="compare__vh">
      <label className="sr-only" htmlFor={`${base}-${label}`}>
        {label}
      </label>
      <select id={`${base}-${label}`} className="compare__select" value={value} onChange={(e) => onChange(e.target.value)}>
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            {v.abbreviation} · {v.name}
          </option>
        ))}
      </select>
      {onRemove ? (
        <button type="button" className="link-btn" onClick={onRemove}>
          Remove
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="compare__view" style={{ ["--cols" as string]: cols }}>
      <div className="compare__bar">
        <label className="toggle">
          <input type="checkbox" checked={shade} onChange={(e) => setShade(e.target.checked)} />
          <span aria-hidden="true" className="toggle__track">
            <span />
          </span>
          Shade the differences
        </label>
        {!third && spare ? (
          <button type="button" className="btn btn--quiet" onClick={() => setThird(spare.id)}>
            + Add {spare.abbreviation}
          </button>
        ) : null}
      </div>
      <div className="compare__row compare__row--head">
        <span />
        {picker(left, setLeft, "First version")}
        {picker(right, setRight, "Second version")}
        {third ? picker(third, setThird, "Third version", () => setThird(null)) : null}
      </div>
      {rows.map((r) => {
        const study = studyVerses.includes(r.verse);
        return (
          <div key={r.verse} className="compare__row" id={`v${r.verse}`}>
            <span className="compare__n">
              {study ? (
                <Link href={`/bsb/${bookSlug}/${chapter}/${r.verse}/study`} aria-label={`Study verse ${r.verse}`}>
                  {r.verse}
                </Link>
              ) : (
                r.verse
              )}
            </span>
            {shown.map((id, i) => (
              <p key={`${id}-${i}`} className={i === 0 ? "compare__t" : "compare__t compare__t--other"}>
                <span className="compare__k">
                  {byId.get(id)?.abbreviation}
                </span>
                <Shaded text={r.texts[id] ?? ""} other={i === 0 ? r.texts[right] : r.texts[left]} shade={shade && id !== (i === 0 ? right : left)} k={`${r.verse}-${id}`} />
              </p>
            ))}
          </div>
        );
      })}
      <p className="compare__help">
        Tap a verse number to study the {testament === "NT" ? "Greek" : "Hebrew"} behind it.
      </p>
    </div>
  );
}
