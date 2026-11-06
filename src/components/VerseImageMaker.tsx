"use client";
import { useState } from "react";
import { CloseIcon } from "./Icons";
import { useDialog } from "./useDialog";

const STYLES = [
  { id: "paper", name: "Paper", bg: "#FBF8F3", ink: "#1F1B16" },
  { id: "night", name: "Night", bg: "#16130F", ink: "#EFE8DD" },
  { id: "dawn", name: "Dawn", bg: "#EBCB92", ink: "#2A1F12" },
];
const SHAPES = [
  { id: "post", name: "Post", ratio: "1080 / 1350" },
  { id: "square", name: "Square", ratio: "1 / 1" },
  { id: "story", name: "Story", ratio: "1080 / 1920" },
];

/** "Verse image" dialog: pick a style and shape, then save or share the PNG made by /img/... */
export function VerseImageMaker({ path, reference, label = "Verse image", className = "btn btn--quiet" }: { path: string; reference: string; label?: string; className?: string }) {
  const { ref: dialogRef, open, close, onClick } = useDialog();
  const [style, setStyle] = useState("paper");
  const [shape, setShape] = useState("post");
  const [busy, setBusy] = useState(false);
  const src = `/img${path}?style=${style}&shape=${shape}`;
  const filename = `${reference.replace(/[^A-Za-z0-9]+/g, "-")}-${shape}.png`;
  const ratio = SHAPES.find((s) => s.id === shape)!.ratio;

  const share = async () => {
    setBusy(true);
    try {
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: reference });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch {
      /* share sheet dismissed */
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className={className} aria-haspopup="dialog" onClick={open}>
        {label}
      </button>
      <dialog ref={dialogRef} className="popover" aria-labelledby="image-title" onClick={onClick}>
        <div className="popover__head">
          <h2 id="image-title">Verse image</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={close}>
            <CloseIcon />
          </button>
        </div>
        <div className="popover__body image-maker">
          <div className="image-maker__preview">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated PNG, already sized */}
            <img src={src} alt={`${reference} as an image, ${style} style`} style={{ aspectRatio: ratio }} />
          </div>
          <div className="setting">
            <h3>Style</h3>
            <div className="segmented" role="group" aria-label="Style">
              {STYLES.map((s) => (
                <button key={s.id} type="button" aria-pressed={style === s.id} onClick={() => setStyle(s.id)} style={{ background: s.bg, color: s.ink, borderColor: style === s.id ? "var(--link)" : undefined, borderWidth: style === s.id ? 2 : 1 }}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div className="setting">
            <h3>Shape</h3>
            <div className="segmented" role="group" aria-label="Shape">
              {SHAPES.map((s) => (
                <button key={s.id} type="button" aria-pressed={shape === s.id} onClick={() => setShape(s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div className="actions" style={{ marginTop: 24 }}>
            <a className="btn" href={src} download={filename}>
              Save image
            </a>
            <button type="button" className="btn btn--primary" onClick={share} disabled={busy}>
              {busy ? "Preparing…" : "Share"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
