"use client";
import Link from "next/link";
import { VERSIONS } from "@/lib/versions";
import { ChevronDown, CloseIcon } from "./Icons";
import { useDialog } from "./useDialog";

/**
 * Version switcher. Self-hosted versions link to the same chapter in that version.
 * YouVersion Platform versions will be added here once the app key is approved.
 */
export function VersionPicker({ version, path }: { version: string; path: string }) {
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
