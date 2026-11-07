"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { BOOKS } from "@/lib/books";
import { DEFAULT_VERSION, VERSIONS } from "@/lib/versions";

const LAST_KEY = "lamplight:last";
const FALLBACK = { book: "john", chapter: 3 };

function readLast(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}
const subscribe = (on: () => void) => {
  window.addEventListener("storage", on);
  return () => window.removeEventListener("storage", on);
};

const VERSION_IDS = new Set(VERSIONS.map((v) => v.id));
const BOOK_SLUGS = new Set(BOOKS.map((b) => b.slug));

/** The passage a path is about: /bsb/john/3/16/study, /compare/john/3, /kjv/john/3 */
function passageOf(path: string): { book: string; chapter: number; verse?: number } | null {
  const parts = path.split("/").filter(Boolean);
  const [a, b, c, d] = parts[0] === "compare" ? [DEFAULT_VERSION, ...parts.slice(1)] : parts;
  if (!a || !VERSION_IDS.has(a) || !b || !BOOK_SLUGS.has(b) || !c || !/^\d+$/.test(c)) return null;
  return { book: b, chapter: Number(c), verse: d && /^\d+$/.test(d) ? Number(d) : undefined };
}

/**
 * The main menu. Read, Study and Compare follow the passage you are on, or
 * the chapter you last read on this device, so they open somewhere useful.
 */
export function MainNav() {
  const pathname = usePathname();
  const lastRaw = useSyncExternalStore(subscribe, readLast, () => null);
  let last: { book: string; chapter: number } | null = null;
  try {
    const href = lastRaw ? (JSON.parse(lastRaw) as { href?: string }).href : undefined;
    last = href ? passageOf(href) : null;
  } catch {}
  const here = passageOf(pathname);
  const p = here ?? last ?? FALLBACK;
  const readVersion = here && pathname.split("/")[1] !== "compare" ? pathname.split("/")[1] : DEFAULT_VERSION;

  const mode = pathname.startsWith("/compare/")
    ? "compare"
    : pathname.endsWith("/study")
      ? "study"
      : pathname === "/notes"
        ? "notes"
        : pathname.startsWith("/topics")
          ? "topics"
          : pathname.startsWith("/plans")
            ? "plans"
          : here
            ? "read"
            : VERSION_IDS.has(pathname.split("/")[1] ?? "")
              ? "books"
              : null;

  const items = [
    { id: "read", label: "Read", href: `/${readVersion}/${p.book}/${p.chapter}` },
    { id: "study", label: "Study", href: `/${DEFAULT_VERSION}/${p.book}/${p.chapter}/${("verse" in p && p.verse) || 1}/study` },
    { id: "compare", label: "Compare", href: `/compare/${p.book}/${p.chapter}` },
    { id: "books", label: "Books", href: `/${DEFAULT_VERSION}` },
    { id: "topics", label: "Topics", href: "/topics" },
    { id: "plans", label: "Plans", href: "/plans" },
    { id: "notes", label: "My notes", href: "/notes" },
  ];

  return (
    <nav aria-label="Main" className="main-nav">
      {items.map((it) => (
        <Link key={it.id} href={it.href} aria-current={mode === it.id ? "page" : undefined} prefetch={it.id === "books" || it.id === "topics" || it.id === "plans" ? undefined : false}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
