"use client";

import { useId, useState } from "react";

/** Daily verse signup. Posts with fetch; without JavaScript the form posts and redirects. */
export function SubscribeForm({ compact = false }: { compact?: boolean }) {
  const id = useId();
  const [state, setState] = useState<{ status: "idle" | "sending" | "done" | "error"; message?: string }>({ status: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ status: "sending" });
    try {
      const res = await fetch("/api/subscribe", { method: "POST", body: new FormData(e.currentTarget), headers: { Accept: "application/json" } });
      const data = (await res.json()) as { ok: boolean; message: string };
      setState({ status: data.ok ? "done" : "error", message: data.message });
    } catch {
      setState({ status: "error", message: "Couldn’t reach Lamplight. Check your connection and try again." });
    }
  }

  if (state.status === "done") {
    return (
      <p className="subscribe__done" role="status">
        {state.message}
      </p>
    );
  }
  return (
    <form className={compact ? "subscribe subscribe--compact" : "subscribe"} action="/api/subscribe" method="post" onSubmit={onSubmit}>
      <label htmlFor={`${id}-email`} className={compact ? "sr-only" : "subscribe__label"}>
        Your email
      </label>
      <div className="subscribe__row">
        <input id={`${id}-email`} name="email" type="email" required autoComplete="email" placeholder="you@example.com" inputMode="email" />
        <button type="submit" className="btn btn--primary" disabled={state.status === "sending"}>
          {state.status === "sending" ? "Signing up…" : "Get the daily verse"}
        </button>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="subscribe__trap" aria-hidden="true" />
      <p className={state.status === "error" ? "subscribe__note subscribe__note--error" : "subscribe__note"} role="status">
        {state.status === "error" ? state.message : "One verse each morning. Unsubscribe from any email."}
      </p>
    </form>
  );
}
