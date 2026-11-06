"use client";

import { useEffect, useState } from "react";
import { SearchIcon } from "./Icons";

/**
 * "Find a book" filter for the all-books page. The list itself is server
 * rendered; this hides books (and empty groups) whose name doesn't match, and
 * shows the page's "#<targetId>-empty" message when nothing does.
 */
export function BookFilter({ targetId }: { targetId: string }) {
  const [q, setQ] = useState("");

  useEffect(() => {
    const root = document.getElementById(targetId);
    if (!root) return;
    const needle = q.trim().toLowerCase().replace(/\s+/g, "");
    let shown = 0;
    for (const li of root.querySelectorAll<HTMLElement>("[data-book]")) {
      // Match the name and each alias on its own, so a query can't span two of them.
      const match = !needle || li.dataset.book!.split("|").some((name) => name.includes(needle));
      li.hidden = !match;
      if (match) shown++;
    }
    for (const group of root.querySelectorAll<HTMLElement>(".book-group, .testament")) {
      group.hidden = !group.querySelector("[data-book]:not([hidden])");
    }
    const empty = document.getElementById(`${targetId}-empty`);
    if (empty) empty.hidden = shown > 0;
  }, [q, targetId]);

  return (
    <div className="find-book">
      <SearchIcon size={16} />
      <label htmlFor="find-book" className="sr-only">
        Find a book
      </label>
      <input id="find-book" type="search" placeholder="Find a book" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
    </div>
  );
}
