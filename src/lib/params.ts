import { notFound } from "next/navigation";
import { getChapter, getVersionMeta } from "./bible";
import { bookBySlug } from "./books";
import { versionById } from "./versions";

/** Resolve and validate route params shared by the reader and verse pages. */
export async function resolveChapter(params: { version: string; book: string; chapter: string }) {
  const version = versionById(params.version);
  const book = bookBySlug(params.book);
  const n = Number(params.chapter);
  if (!version?.available || version.source !== "self-hosted" || !book || !/^\d+$/.test(params.chapter) || n < 1 || n > book.chapters) {
    notFound();
  }
  const [chapter, meta] = await Promise.all([getChapter(version.id, book.code, n), getVersionMeta(version.id)]);
  if (!chapter || !meta) notFound();
  return { version, book, chapter, meta };
}
