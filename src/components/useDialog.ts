"use client";
import { useCallback, useRef } from "react";

/** Native <dialog> with modal behaviour, Escape to close and click-outside to close. */
export function useDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const open = useCallback(() => ref.current?.showModal(), []);
  const close = useCallback(() => ref.current?.close(), []);
  const onClick = useCallback((e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === ref.current) ref.current?.close();
  }, []);
  return { ref, open, close, onClick };
}
