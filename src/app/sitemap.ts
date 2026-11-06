import type { MetadataRoute } from "next";
import { getVerseNumbers } from "@/lib/bible";
import { BOOKS } from "@/lib/books";
import { SITE_URL, chapterPath, versePath } from "@/lib/site";
import { TOPICS } from "@/lib/topics";
import { AVAILABLE_VERSIONS } from "@/lib/versions";

/**
 * Sitemaps, kept under Google's 50,000-URL limit each:
 *   /sitemap/0.xml  home, topic, book and chapter pages for every self-hosted version
 *   /sitemap/1.xml  BSB Old Testament verse pages
 *   /sitemap/2.xml  BSB New Testament verse pages
 * Each new version adds two verse sitemaps (ids 3 and 4, and so on).
 */
export async function generateSitemaps() {
  return [{ id: 0 }, ...AVAILABLE_VERSIONS.flatMap((_, i) => [{ id: 1 + i * 2 }, { id: 2 + i * 2 }])];
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  if (id === 0) {
    return [
      { url: SITE_URL, changeFrequency: "daily", priority: 1 },
      { url: `${SITE_URL}/topics`, priority: 0.7 },
      ...["about", "subscribe", "donate", "privacy"].map((p) => ({ url: `${SITE_URL}/${p}`, priority: 0.3 })),
      ...TOPICS.map((t) => ({ url: `${SITE_URL}/topics/${t.slug}`, priority: 0.7 })),
      ...AVAILABLE_VERSIONS.flatMap((v) => [
        { url: `${SITE_URL}/${v.id}`, priority: 0.8 },
        ...BOOKS.map((b) => ({ url: `${SITE_URL}/${v.id}/${b.slug}`, priority: 0.7 })),
        ...BOOKS.flatMap((b) =>
          Array.from({ length: b.chapters }, (_, i) => ({ url: `${SITE_URL}${chapterPath(v.id, b.slug, i + 1)}`, priority: 0.7 })),
        ),
      ]),
    ];
  }
  const version = AVAILABLE_VERSIONS[Math.floor((id - 1) / 2)];
  if (!version) return [];
  const testament = id % 2 === 1 ? "OT" : "NT";
  const urls: MetadataRoute.Sitemap = [];
  for (const b of BOOKS.filter((book) => book.testament === testament)) {
    const verses = await getVerseNumbers(version.id, b.code);
    verses.forEach((nums, i) => {
      for (const n of nums) urls.push({ url: `${SITE_URL}${versePath(version.id, b.slug, i + 1, n)}`, priority: 0.5 });
    });
  }
  return urls;
}
