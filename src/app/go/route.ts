import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { parseReference } from "@/lib/reference";
import { chapterPath, versePath } from "@/lib/site";
import { topicForQuery, topicPhrase } from "@/lib/topics";
import { DEFAULT_VERSION } from "@/lib/versions";

/**
 * The header search box submits here. References jump straight to the passage
 * ("jn 3 16" → /bsb/john/3/16), "verses about X" goes to the topic page when there
 * is one, and anything else goes to keyword search.
 */
export function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const version = DEFAULT_VERSION;
  if (!q) redirect("/");
  const ref = parseReference(q);
  if (ref) {
    const chapter = ref.chapter ?? 1;
    if (ref.verse && !ref.verseEnd) redirect(versePath(version, ref.book.slug, chapter, ref.verse));
    const hash = ref.verse ? `#${ref.book.code}.${chapter}.${ref.verse}` : "";
    redirect(`${chapterPath(version, ref.book.slug, chapter)}${hash}`);
  }
  const phrase = topicPhrase(q);
  const topic = phrase ? topicForQuery(phrase) : undefined;
  if (topic) redirect(`/topics/${topic.slug}`);
  redirect(`/search?q=${encodeURIComponent(q)}`);
}
