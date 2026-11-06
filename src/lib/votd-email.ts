import { getChapter } from "./bible";
import { bookByCode, chapterName } from "./books";
import { SITE_URL, chapterPath, versePath } from "./site";
import { DEFAULT_VERSION } from "./versions";
import { votdForDate } from "./votd";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Small caps for the divine name, as on the site. */
const divine = (s: string) => esc(s).replace(/\b(LORD|GOD|YAH)\b/g, (m) => `<span style="font-variant:small-caps">${m[0]}${m.slice(1).toLowerCase()}</span>`);

/** The verse-of-the-day email for a date, in HTML and plain text. */
export async function votdEmail(date: Date, opts: { unsubscribe: boolean }) {
  const { code, chapter, verse } = votdForDate(date);
  const book = bookByCode(code)!;
  const text = (await getChapter(DEFAULT_VERSION, code, chapter))?.verses.find(([n]) => n === verse)?.[1] ?? "";
  const ref = `${chapterName(book)} ${chapter}:${verse}`;
  const verseUrl = `${SITE_URL}${versePath(DEFAULT_VERSION, book.slug, chapter, verse)}`;
  const chapterUrl = `${SITE_URL}${chapterPath(DEFAULT_VERSION, book.slug, chapter)}`;
  const day = date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  // Resend replaces this placeholder in broadcasts with each contact's own link.
  const unsub = opts.unsubscribe ? "{{{RESEND_UNSUBSCRIBE_URL}}}" : "";
  const html = `<!doctype html><html><body style="margin:0;background:#fbf8f3;color:#1f1b16">
<div style="max-width:560px;margin:0 auto;padding:40px 24px;font-family:Georgia,'Times New Roman',serif">
<p style="margin:0 0 24px;font-variant:small-caps;letter-spacing:.06em;color:#9e3324;font-size:17px">Verse for ${esc(day)}</p>
<p style="margin:0 0 20px;font-size:28px;line-height:1.3">${divine(text)}</p>
<p style="margin:0 0 32px;font-size:16px;color:#5e5549"><a href="${verseUrl}" style="color:#1f1b16;font-weight:bold;text-decoration:none">${esc(ref)}</a> · Berean Standard Bible</p>
<p style="margin:0 0 40px"><a href="${chapterUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#1f1b16;color:#fbf8f3;font-family:system-ui,sans-serif;font-size:15px;text-decoration:none">Read ${esc(chapterName(book))} ${chapter}</a></p>
<p style="margin:0;border-top:1px solid #cdbfa8;padding-top:16px;font-family:system-ui,sans-serif;font-size:13px;color:#5e5549">Lamplight · free, no ads, no store.${unsub ? ` <a href="${unsub}" style="color:#5e5549">Unsubscribe</a>` : ""}</p>
</div></body></html>`;
  const plain = `Verse for ${day}\n\n${text}\n${ref} (Berean Standard Bible)\n\nRead ${chapterName(book)} ${chapter}: ${chapterUrl}\n${unsub ? `\nUnsubscribe: ${unsub}\n` : ""}`;
  return { subject: `${ref}: ${text.length > 60 ? `${text.slice(0, 57).trimEnd()}…` : text}`, html, text: plain, ref };
}
