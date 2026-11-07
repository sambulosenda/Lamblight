# Lamplight

A fast, ad-free Bible website. Next.js (App Router, Cache Components) and TypeScript.

Product docs: the PRD and the design canvas live in the Lamplight project on claude.ai.
Design tokens in `src/app/globals.css` use the same names as the canvas (`lamplight-tokens.css`).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # parser and reference tests
npm run build        # prerenders every chapter (about 1,200 pages, ~45 s)
```

Set `NEXT_PUBLIC_SITE_URL` (see `.env.example`) once the domain is chosen. It is used for canonical URLs, sitemaps and JSON-LD.

## How it fits together

| Path | What it is |
| --- | --- |
| `data/<version>/` | Imported Bible text: one JSON file per book plus `meta.json`. Committed, so builds never depend on ebible.org. |
| `scripts/import-bible.ts` | USFM importer. `npm run import -- bsb` downloads from ebible.org; `--src <folder>` uses local files. |
| `src/lib/usfm.ts` | USFM parser: paragraphs, poetry lines, headings, footnotes, divine name, verse plain text. |
| `src/lib/books.ts` | The 66 books: USFM code, URL slug, names, aliases. |
| `src/lib/reference.ts` | Reference parser ("jn 3 16", "1 Cor 13:4-7", "Jhon 3:16"). |
| `src/lib/bible.ts` | Server data access. Swap for Postgres later without touching pages. |
| `src/lib/search.ts` | In-memory keyword search for the MVP (Meilisearch/Typesense later). |

Canonical verse IDs are `BOOK.chapter.verse` (e.g. `JHN.3.16`). Each verse in the reader is a
`<span class="verse" data-v="16">`, and the first one carries `id="JHN.3.16"` for deep links.

## Routes

| URL | Page | Rendering |
| --- | --- | --- |
| `/` | Home with verse of the day | Static, refreshed hourly |
| `/bsb` | All books | Static |
| `/bsb/john` | Chapters of a book | Static |
| `/bsb/john/3` | Chapter reader | Static, all chapters prerendered |
| `/bsb/john/3/16` | Verse page (search landing) | Static. The first verse of each chapter is prerendered; the rest render once on first visit, then come from the cache. `PRERENDER_ALL_VERSES=1` builds all 31,000 up front. |
| `/go?q=` | Header search: jumps to a reference, or falls through to `/search` | Redirect |
| `/search?q=` | Keyword search | Per request |
| `/sitemap/0.xml`... | Book and chapter pages; OT verses; NT verses | Static |

Reader preferences (text size, theme) live in `localStorage` and are applied by an inline
script before first paint, so pages stay static with no flash.

## Adding a version

1. Add it to `SOURCES` in `scripts/import-bible.ts` (WEB and KJV are already there).
2. Import it: `npm run import -- web` locally, or run the **Import Bible text** workflow in
   GitHub Actions, which downloads from ebible.org and opens a pull request with the data.
3. Set `available: true` for it in `src/lib/versions.ts`. Verse pages then show it under
   "In other versions" and it appears in the version switcher.

Licensed versions (YouVersion Platform) will load in the browser only and never get
server-rendered or indexed pages.

## Audio

World English Bible chapters can be played with the Listen button in the reader. The recording
is by Winfred W. Henson and is in the public domain ([ebible.org](https://ebible.org/eng-web/audio/)).
The files live in a Cloudflare R2 bucket, not in the repo.

1. Create an R2 bucket (for example `lamplight-audio`) and give it public access, through a custom
   domain or the `r2.dev` URL.
2. With ffmpeg installed and `wrangler login` done, run
   `npm run import:audio -- --bucket lamplight-audio`. It downloads each chapter from ebible.org,
   re-encodes it to 64 kbps mono (about 2.7 GB in all, 1,189 files), uploads it as
   `web/<BOOK>/<chapter>.mp3`, and records it in `data/audio/web.json`. If it stops, run it again
   and it carries on. `--books JHN,PSA` limits it to some books, and `--check` only checks that
   every book has the right number of files.
3. Commit `data/audio/web.json` and set `AUDIO_BASE_URL` to the bucket's public URL.

A chapter gets a Listen button only when it is in the manifest and `AUDIO_BASE_URL` is set, so a
half-finished upload never shows a broken player.

## Data source note

All committed Bible text comes from ebible.org (see `source` and `importedAt` in each
`data/<version>/meta.json`). The BSB was first imported from a fork with errors (Genesis 2:4
repeated "God made them."; Judges 13:1, Lamentations 2:1 and Psalm 106:42 were missing) and
was re-imported from ebible.org on 7 Nov 2026.

Study mode data (`data/study/`) comes from berean-build, which follows an earlier BSB
revision, so its English wording can differ slightly from the reader text in some verses.
