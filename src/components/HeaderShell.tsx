"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Sticky site header that slides away while you scroll down on a phone and comes
 * back as soon as you scroll up, so reading gets the whole screen. On wider
 * screens it always stays put.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  /** Movement so far in the current direction, so slow scrolling still counts. */
  const travel = useRef(0);
  /** Scrolls before this time come from navigation (e.g. jumping to a verse), not the reader. */
  const ignoreUntil = useRef(0);

  // Show the header again after every navigation.
  const pathname = usePathname();
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setHidden(false);
  }
  useEffect(() => {
    ignoreUntil.current = performance.now() + 600;
    lastY.current = window.scrollY;
    travel.current = 0;
  }, [pathname]);

  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 640px)");
    lastY.current = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const delta = y - lastY.current;
        lastY.current = y;
        if (performance.now() < ignoreUntil.current) return;
        if (!narrow.matches || y < 64) {
          travel.current = 0;
          setHidden(false);
          return;
        }
        travel.current = Math.sign(delta) === Math.sign(travel.current) ? travel.current + delta : delta;
        if (travel.current > 6) setHidden(true);
        else if (travel.current < -6) setHidden(false);
      });
    };
    const onFocus = () => setHidden(false);
    const onHash = () => {
      ignoreUntil.current = performance.now() + 600;
      setHidden(false);
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("scroll", onScroll, { passive: true });
    narrow.addEventListener("change", onScroll);
    document.addEventListener("focusin", onFocus);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", onHash);
      narrow.removeEventListener("change", onScroll);
      document.removeEventListener("focusin", onFocus);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className="site-header" data-hidden={hidden ? "" : undefined}>
      {children}
    </header>
  );
}
