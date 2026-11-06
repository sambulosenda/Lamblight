import type { NextRequest } from "next/server";
import { getChapter, getVersionMeta } from "@/lib/bible";
import { bookBySlug, chapterName } from "@/lib/books";
import { SITE_URL, versePath } from "@/lib/site";
import { CARD_SHAPES, CARD_STYLES, renderVerseCard, type CardShape, type CardStyle } from "@/lib/verse-image";
import { versionById } from "@/lib/versions";

/**
 * Verse image, e.g. /img/bsb/john/3/16?style=night&shape=story
 * style: paper | night | dawn   shape: post (1080×1350) | square | story | og (1200×630 link preview)
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/img/[version]/[book]/[chapter]/[verse]">) {
  const p = await ctx.params;
  const version = versionById(p.version);
  const book = bookBySlug(p.book);
  const chapterNum = Number(p.chapter);
  const verseNum = Number(p.verse);
  if (!version?.available || !book || !(chapterNum >= 1 && chapterNum <= book.chapters)) return new Response("Not found", { status: 404 });

  const [chapter, meta] = await Promise.all([getChapter(version.id, book.code, chapterNum), getVersionMeta(version.id)]);
  const text = chapter?.verses.find(([n]) => n === verseNum)?.[1];
  if (!text || !meta) return new Response("Not found", { status: 404 });

  const qs = request.nextUrl.searchParams;
  const style = (qs.get("style") ?? "paper") as CardStyle;
  const shape = (qs.get("shape") ?? "post") as CardShape;
  if (!(style in CARD_STYLES) || !(shape in CARD_SHAPES)) return new Response("Unknown style or shape", { status: 400 });

  const host = new URL(SITE_URL).host;
  return renderVerseCard({
    text,
    reference: `${chapterName(book)} ${chapterNum}:${verseNum}`,
    versionName: meta.name,
    displayUrl: `${host}${versePath(version.id, book.slug, chapterNum, verseNum)}`,
    style,
    shape,
  });
}
