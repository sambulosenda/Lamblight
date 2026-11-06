"use client";
import Link from "next/link";
import { useState } from "react";
import { BOOKS, type Book } from "@/lib/books";
import { chapterPath } from "@/lib/site";
import { ChevronDown, CloseIcon } from "./Icons";
import { useDialog } from "./useDialog";

export function ChapterPicker({ version, bookCode, chapter, label }: { version: string; bookCode: string; chapter: number; label: string }) {
  const { ref: dialogRef, open: openDialog, close: closeDialog, onClick: onDialogClick } = useDialog();
  const [book, setBook] = useState<Book | null>(null);
  const current = BOOKS.find((b) => b.code === bookCode)!;

  const openPicker = () => {
    setBook(null);
    openDialog();
  };

  return (
    <>
      <button type="button" className="chip" aria-haspopup="dialog" onClick={openPicker}>
        {label} <ChevronDown />
      </button>
      <dialog ref={dialogRef} className="popover" aria-labelledby="picker-title" onClick={onDialogClick}>
        <div className="popover__head">
          {book ? (
            <button type="button" className="chip" onClick={() => setBook(null)}>
              ← Books
            </button>
          ) : null}
          <h2 id="picker-title">{book ? book.name : "Choose a book"}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={closeDialog}>
            <CloseIcon />
          </button>
        </div>
        <div className="popover__body">
          {book ? (
            <ul className="chapter-grid" aria-label={`${book.name} chapters`}>
              {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => (
                <li key={n}>
                  <Link
                    href={chapterPath(version, book.slug, n)}
                    aria-current={book.code === bookCode && n === chapter ? "page" : undefined}
                    onClick={closeDialog}
                  >
                    {n}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            (["OT", "NT"] as const).map((t) => (
              <div key={t} className="testament">
                <h3 className="eyebrow">{t === "OT" ? "Old Testament" : "New Testament"}</h3>
                <ul className="book-list">
                  {BOOKS.filter((b) => b.testament === t).map((b) => (
                    <li key={b.code}>
                      {b.chapters === 1 ? (
                        <Link href={chapterPath(version, b.slug, 1)} onClick={closeDialog} aria-current={b.code === current.code ? "true" : undefined}>
                          {b.name}
                        </Link>
                      ) : (
                        <button type="button" onClick={() => setBook(b)} aria-current={b.code === current.code ? "true" : undefined}>
                          {b.name}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </dialog>
    </>
  );
}
