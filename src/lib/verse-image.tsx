import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

/** Card styles and shapes from the design canvas ("Verse image maker" and "Shared verse image"). */
export const CARD_STYLES = {
  paper: { name: "Paper", bg: "#FBF8F3", ink: "#1F1B16", mark: "#B8741A", glow: 0.35 },
  night: { name: "Night", bg: "#16130F", ink: "#EFE8DD", mark: "#D9973F", glow: 0.4 },
  dawn: { name: "Dawn", bg: "#EBCB92", ink: "#2A1F12", mark: "#6B4210", glow: 0.3 },
} as const;

export const CARD_SHAPES = {
  post: { name: "Post", width: 1080, height: 1350 },
  square: { name: "Square", width: 1080, height: 1080 },
  story: { name: "Story", width: 1080, height: 1920 },
  og: { name: "Link preview", width: 1200, height: 630 },
} as const;

export type CardStyle = keyof typeof CARD_STYLES;
export type CardShape = keyof typeof CARD_SHAPES;

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 600; style: "normal" }[]> | null = null;
function loadFonts() {
  fonts ??= Promise.all(
    [
      ["Literata", "Literata-wght-400.ttf", 400],
      ["Literata", "Literata-wght-600.ttf", 600],
      ["Inter", "Inter-wght-400.ttf", 400],
      ["Inter", "Inter-wght-600.ttf", 600],
    ].map(async ([name, file, weight]) => ({
      name: name as string,
      data: await readFile(path.join(process.cwd(), "assets", "fonts", file as string)),
      weight: weight as 400 | 600,
      style: "normal" as const,
    })),
  );
  return fonts;
}

const Lamp = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6" />
    <path d="M12 3v2" />
    <path d="M8 7h8l-1 11H9z" />
    <path d="M12 10.5c-.9 1-1.3 1.8-1.3 2.6a1.3 1.3 0 0 0 2.6 0c0-.8-.4-1.6-1.3-2.6z" />
    <path d="M7 21h10" />
  </svg>
);

/**
 * Pick a font size so the verse fills the text area without overflowing.
 * Text area ≈ chars × (0.5·fs) × (1.28·fs), so fs ≈ √(area / (0.64 · chars)).
 */
function fitFontSize(text: string, width: number, height: number, max: number, min: number) {
  const area = width * height;
  const fs = Math.sqrt(area / (0.7 * Math.max(text.length, 20)));
  return Math.round(Math.max(min, Math.min(max, fs)));
}

export async function renderVerseCard(opts: {
  text: string;
  reference: string;
  versionName: string;
  displayUrl: string;
  style: CardStyle;
  shape: CardShape;
}) {
  const s = CARD_STYLES[opts.style];
  const { width, height } = CARD_SHAPES[opts.shape];
  const og = opts.shape === "og";
  const scale = og ? 0.62 : 1;
  const padX = og ? 80 : 112;
  const textH = og ? 300 : height - 640;
  const fs = fitFontSize(opts.text, width - padX * 2, textH, og ? 52 : 92, og ? 24 : 34);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: s.bg,
          color: s.ink,
          padding: og ? "56px 80px 48px" : "120px 112px 96px",
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        <svg width={520 * scale} height={520 * scale} viewBox="0 0 520 520" style={{ position: "absolute", right: -150 * scale, top: -150 * scale, opacity: s.glow }}>
          <circle cx="260" cy="260" r="258" fill="none" stroke={s.mark} strokeWidth="2" />
          <circle cx="260" cy="260" r="190" fill="none" stroke={s.mark} strokeWidth="2" />
          <circle cx="260" cy="260" r="122" fill="none" stroke={s.mark} strokeWidth="2" />
        </svg>
        <div style={{ fontFamily: "Literata", fontSize: 240 * scale, lineHeight: 0.7, color: s.mark, height: 120 * scale, display: "flex" }}>“</div>
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: og ? "center" : "flex-start",
            marginTop: og ? 0 : 56,
            fontFamily: "Literata",
            fontSize: fs,
            lineHeight: 1.28,
            letterSpacing: "-0.015em",
          }}
        >
          {opts.text}
        </div>
        <div style={{ width: 96 * scale, height: 4, background: s.mark, margin: `${og ? 16 : 40}px 0 ${32 * scale}px` }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 40 * scale, fontWeight: 600 }}>{opts.reference}</div>
            <div style={{ fontSize: 28 * scale, opacity: 0.75, marginTop: 8 * scale }}>{opts.versionName}</div>
          </div>
          {og ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "Literata", fontSize: 30, fontWeight: 600 }}>
              <Lamp color={s.mark} size={32} />
              Lamplight
            </div>
          ) : null}
        </div>
        {og ? null : (
          <div style={{ marginTop: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: "Literata", fontSize: 34, fontWeight: 600 }}>
              <Lamp color={s.mark} size={36} />
              Lamplight
            </div>
            <div style={{ fontSize: 26, opacity: 0.75 }}>{opts.displayUrl}</div>
          </div>
        )}
      </div>
    ),
    {
      width,
      height,
      fonts: await loadFonts(),
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable" },
    },
  );
}
