"use client";
import Link from "next/link";
import { VERSIONS } from "@/lib/versions";
import { ChevronDown, CloseIcon } from "./Icons";
import { useDialog } from "./useDialog";

/**
 * Version switcher. Self-hosted versions link to the same chapter in that version.
 * YouVersion Platform versions will be added here once the app key is approved.
 */
export function VersionPicker({ version, path, previews = {} }: { version: string; path: string; /** How John 3:16 reads in each version. */ previews?: Record<string, string> }) {
  const { ref: dialogRef, open: openDialog, close: closeDialog, onClick: onDialogClick } = useDialog();
  const current = VERSIONS.find((v) => v.id === version);
  return (
    <>
      <button type="button" className="chip" aria-haspopup="dialog" aria-label={`Version: ${current?.name}`} onClick={openDialog}>
        {current?.abbreviation} <ChevronDown />
      </button>
      <dialog ref={dialogRef} className="popover" aria-labelledby="version-title" onClick={onDialogClick}>
        <div className="popover__head">
          <h2 id="version-title">Choose a version</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={closeDialog}>
            <CloseIcon />
          </button>
        </div>
        <div className="popover__body">
          {Object.keys(previews).length ? <p className="option-hint">How John 3:16 reads in each</p> : null}
          <ul className="option-list">
            {VERSIONS.map((v) =>
              v.available ? (
                <li key={v.id}>
                  <Link
                    className="option"
                    href={`/${v.id}${path}`}
                    aria-current={v.id === version ? "true" : undefined}
                    onClick={() => {
                      try {
                        localStorage.setItem("lamplight:version", v.id);
                      } catch {}
                      closeDialog();
                    }}
                  >
                    <span className="option__abbr">{v.abbreviation}</span>
                    <span>{v.name}</span>
                    <span className="option__note">{v.id === version ? "Reading" : ""}</span>
                    {previews[v.id] ? (
                      <span className="option__preview">
                        <span className="sr-only">John 3:16 reads: </span>“{previews[v.id]}”
                      </span>
                    ) : null}
                  </Link>
                </li>
              ) : (
                <li key={v.id}>
                  <span className="option" aria-disabled="true">
                    <span className="option__abbr">{v.abbreviation}</span>
                    <span>{v.name}</span>
                    <span className="option__note">Coming soon</span>
                  </span>
                </li>
              ),
            )}
          </ul>
        </div>
      </dialog>
    </>
  );
}
