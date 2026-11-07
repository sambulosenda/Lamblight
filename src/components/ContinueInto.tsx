"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

const PREFS_KEY = "lamplight:prefs";

function continuousOn(): boolean {
  try {
    return (JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as { continuous?: boolean }).continuous !== false;
  } catch {
    return true;
  }
}

/**
 * The opening of the next chapter, set under this one so reading runs on.
 * Scrolling on past it opens the next chapter (unless the reader has turned
 * continuous scroll off in Text size and theme). The links always work.
 */
export function ContinueInto({ href, label, back, children }: { href: string; label: string; back: { href: string; label: string } | null; children: ReactNode }) {
  const router = useRouter();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = end.current;
    if (!el || !("IntersectionObserver" in window)) return;
    router.prefetch(href);
    const startY = window.scrollY;
    let done = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        // Only when the reader has scrolled here themselves, not on a short page that starts at the bottom.
        if (!entry.isIntersecting || done || window.scrollY - startY < 200 || !continuousOn()) return;
        done = true;
        router.push(href);
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [href, router]);

  return (
    <section className="continue-into" aria-label={`${label} continues below`}>
      <Link href={href} className="continue-into__text" tabIndex={-1} aria-hidden="true">
        <div className="scripture">{children}</div>
      </Link>
      <p className="continue-into__links">
        <Link href={href}>Keep reading into {label}</Link>
        {back ? <Link href={back.href}>Back to {back.label}</Link> : null}
      </p>
      <div ref={end} className="continue-into__end" aria-hidden="true" />
    </section>
  );
}
