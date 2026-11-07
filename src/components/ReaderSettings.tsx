"use client";
import { useState } from "react";
import { CloseIcon } from "./Icons";
import { useDialog } from "./useDialog";

type Theme = "light" | "dark" | "system";
interface Prefs {
  theme?: Theme;
  size?: number;
  /** Scrolling past the end of a chapter opens the next one. On unless turned off. */
  continuous?: boolean;
}

const KEY = "lamplight:prefs";
const SIZES = [1, 2, 3, 4, 5];

function readPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Prefs;
  } catch {
    return {};
  }
}

function apply(prefs: Prefs) {
  const root = document.documentElement;
  const theme = prefs.theme === "light" || prefs.theme === "dark" ? prefs.theme : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  root.dataset.theme = theme;
  root.dataset.size = String(prefs.size ?? 3);
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {}
}

/** "Aa" button: text size (5 steps) and light, dark or system theme. */
export function ReaderSettings() {
  const { ref: dialogRef, open: openDialog, close: closeDialog, onClick: onDialogClick } = useDialog();
  const [prefs, setPrefs] = useState<Prefs>({});

  const update = (next: Prefs) => {
    setPrefs(next);
    apply(next);
  };

  return (
    <>
      <button
        type="button"
        className="icon-btn"
        aria-haspopup="dialog"
        aria-label="Text size and theme"
        style={{ fontFamily: "var(--font-scripture)", fontSize: 18, fontWeight: 600 }}
        onClick={() => {
          setPrefs(readPrefs());
          openDialog();
        }}
      >
        Aa
      </button>
      <dialog ref={dialogRef} className="popover" aria-labelledby="settings-title" onClick={onDialogClick}>
        <div className="popover__head">
          <h2 id="settings-title">Text size and theme</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={closeDialog}>
            <CloseIcon />
          </button>
        </div>
        <div className="popover__body">
          <p className="preview">Your word is a lamp to my feet and a light to my path.</p>
          <div className="setting">
            <h3>Text size</h3>
            <div className="segmented" role="group" aria-label="Text size">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={(prefs.size ?? 3) === s}
                  aria-label={`Size ${s} of 5`}
                  style={{ fontFamily: "var(--font-scripture)", fontSize: 13 + s * 2 }}
                  onClick={() => update({ ...prefs, size: s })}
                >
                  A
                </button>
              ))}
            </div>
          </div>
          <div className="setting">
            <h3>Theme</h3>
            <div className="segmented" role="group" aria-label="Theme">
              {(["light", "dark", "system"] as Theme[]).map((t) => (
                <button key={t} type="button" aria-pressed={(prefs.theme ?? "system") === t} onClick={() => update({ ...prefs, theme: t })}>
                  {t === "light" ? "Light" : t === "dark" ? "Dark" : "Match device"}
                </button>
              ))}
            </div>
          </div>
          <div className="setting">
            <h3>At the end of a chapter</h3>
            <div className="segmented" role="group" aria-label="At the end of a chapter">
              <button type="button" aria-pressed={prefs.continuous !== false} onClick={() => update({ ...prefs, continuous: true })}>
                Keep scrolling into the next
              </button>
              <button type="button" aria-pressed={prefs.continuous === false} onClick={() => update({ ...prefs, continuous: false })}>
                Stop and show links
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
