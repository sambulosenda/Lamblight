"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Sticky site header that slides away while you scroll down on a phone and comes
 * back as soon as you scroll up, so reading gets the whole screen. On wider
 * screens it always stays put.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 640px)");
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const delta = y - lastY.current;
        if (!narrow.matches || y < 64) setHidden(false);
        else if (delta > 6) setHidden(true);
        else if (delta < -6) setHidden(false);
        lastY.current = y;
      });
    };
    const onFocus = () => setHidden(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    narrow.addEventListener("change", onScroll);
    document.addEventListener("focusin", onFocus);
    return () => {
      window.removeEventListener("scroll", onScroll);
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
