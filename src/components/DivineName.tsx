import { Fragment, type ReactNode } from "react";

/**
 * The BSB prints the divine name as plain capitals ("LORD", "GOD", "YAH").
 * Render those words as small caps instead, so they read as "Lord" in the
 * traditional typographic form rather than shouting in all caps.
 */
const DIVINE = /\b(LORD|GOD|YAH)\b/g;

export function withDivineName(text: string, keyPrefix = "dn"): ReactNode {
  if (!DIVINE.test(text)) return text;
  DIVINE.lastIndex = 0;
  const parts = text.split(DIVINE);
  return parts.map((part, i) =>
    i % 2 ? (
      <span key={`${keyPrefix}-${i}`} className="nd">
        {part[0] + part.slice(1).toLowerCase()}
      </span>
    ) : (
      <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>
    ),
  );
}
