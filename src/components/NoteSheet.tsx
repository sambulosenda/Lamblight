"use client";

import { useEffect, useId, useState } from "react";
import { CloseIcon } from "./Icons";
import { COLOURS, COLOUR_LABEL, saveColourNames, updateMark, useColourNames, useMarks } from "@/lib/marks";

interface Props {
  /** Canonical verse ID, e.g. JHN.3.16 */
  id: string;
  /** "John 3:16" */
  reference: string;
  text: string;
  version: string;
  open: boolean;
  onClose: () => void;
}

/**
 * The sheet for one verse: highlight colour (each colour has a name the reader
 * chooses), a note and tags. Changes save as you type, on this device only.
 */
export function NoteSheet({ id, reference, text, version, open, onClose }: Props) {
  const base = useId();
  const marks = useMarks();
  const names = useColourNames();
  const mark = marks[id];
  const [renaming, setRenaming] = useState(false);
  const [draftNames, setDraftNames] = useState(names);
  const [tag, setTag] = useState("");
  const [failed, setFailed] = useState(false);
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open, dialog]);

  const save = (patch: Parameters<typeof updateMark>[2]) => setFailed(!updateMark(id, { text, version }, patch));
  const colour = mark?.colour;
  const tags = mark?.tags ?? [];

  const addTag = () => {
    const t = tag.trim().replace(/\s+/g, " ").slice(0, 40);
    if (t && !tags.includes(t)) save({ tags: [...tags, t] });
    setTag("");
  };

  return (
    <dialog
      ref={setDialog}
      className="popover note-sheet"
      aria-labelledby={`${base}-title`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="popover__head">
        <h2 id={`${base}-title`} className="note-sheet__ref">
          {reference.replace(/\s[\d:–,\s]+$/, "")} <span className="rubric">{reference.match(/[\d:–,\s]+$/)?.[0].trim()}</span>
        </h2>
        <button type="button" className="note-sheet__done" onClick={() => dialog?.close()}>
          Done
        </button>
      </div>
      <div className="popover__body note-sheet__body">
        <div className="note-sheet__colours">
          <div role="radiogroup" aria-label="Highlight colour" className="swatches">
            {COLOURS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={colour === c}
                aria-label={`${COLOUR_LABEL[c]}, ${names[c]}`}
                className="swatch"
                data-colour={c}
                onClick={() => save({ colour: c })}
              >
                <span />
              </button>
            ))}
          </div>
          {colour ? (
            <button type="button" className="note-sheet__remove" onClick={() => save({ colour: undefined })}>
              Remove highlight
            </button>
          ) : null}
        </div>
        <p className="note-sheet__meaning">
          {colour ? (
            <>
              {COLOUR_LABEL[colour]} means <strong>{names[colour]}</strong> for you.{" "}
            </>
          ) : (
            <>Choose a colour to highlight this verse. </>
          )}
          <button
            type="button"
            className="link-btn"
            aria-expanded={renaming}
            onClick={() => {
              setDraftNames(names);
              setRenaming(!renaming);
            }}
          >
            Rename colours
          </button>
        </p>
        {renaming ? (
          <form
            className="rename-colours"
            onSubmit={(e) => {
              e.preventDefault();
              setFailed(!saveColourNames(draftNames));
              setRenaming(false);
            }}
          >
            {COLOURS.map((c) => (
              <label key={c} className="rename-colours__row">
                <span className="dot" data-colour={c} aria-hidden="true" />
                <span className="sr-only">{COLOUR_LABEL[c]} means</span>
                <input value={draftNames[c]} maxLength={24} onChange={(e) => setDraftNames({ ...draftNames, [c]: e.target.value })} />
              </label>
            ))}
            <button type="submit" className="btn">
              Save names
            </button>
          </form>
        ) : null}

        <label htmlFor={`${base}-note`} className="note-sheet__label">
          Your note
        </label>
        <div className="note-sheet__box">
          <textarea
            id={`${base}-note`}
            rows={6}
            value={mark?.note ?? ""}
            placeholder="What stands out to you?"
            onChange={(e) => save({ note: e.target.value })}
          />
          <div className="note-sheet__tags">
            {tags.map((t) => (
              <span key={t} className="tag">
                {t}
                <button type="button" aria-label={`Remove tag ${t}`} onClick={() => save({ tags: tags.filter((x) => x !== t) })}>
                  <CloseIcon />
                </button>
              </span>
            ))}
            <label className="sr-only" htmlFor={`${base}-tag`}>
              Add a tag
            </label>
            <input
              id={`${base}-tag`}
              className="tag-input"
              value={tag}
              placeholder="+ Tag"
              enterKeyHint="done"
              onChange={(e) => setTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag();
                }
              }}
              onBlur={addTag}
            />
          </div>
        </div>
        <p className="note-sheet__foot" aria-live="polite">
          {failed ? "This browser isn’t letting Lamplight save. Your note will be lost when you leave." : "Saved on this device. Only you can see it."}
        </p>
      </div>
    </dialog>
  );
}
