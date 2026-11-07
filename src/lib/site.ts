/** Public site settings. Set NEXT_PUBLIC_SITE_URL once the domain is chosen. */
export const SITE_NAME = "Lamplight";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SITE_DESCRIPTION =
  "Read the Bible free, with no ads and no store. Clean chapter reading, fast verse search and easy sharing.";

export const chapterPath = (version: string, bookSlug: string, chapter: number) => `/${version}/${bookSlug}/${chapter}`;
export const versePath = (version: string, bookSlug: string, chapter: number, verse: number) =>
  `/${version}/${bookSlug}/${chapter}/${verse}`;
export const comparePath = (bookSlug: string, chapter: number) => `/compare/${bookSlug}/${chapter}`;
