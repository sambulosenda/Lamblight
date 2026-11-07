/** data/audio/<version>.json, written by scripts/import-audio.ts. */
export interface AudioManifest {
  version: string;
  narrator: string;
  source: string;
  licence: string;
  bitrate: string;
  /** "JHN.3" → length in seconds and file size. Only chapters uploaded to storage are listed. */
  chapters: Record<string, { duration: number; bytes: number }>;
}

/** One chapter's recording, as the player needs it. */
export interface AudioTrack {
  /** "JHN.3" */
  key: string;
  /** "John 3" */
  title: string;
  url: string;
  /** The chapter page, for following along. */
  href: string;
  /** Seconds, from the manifest. */
  duration: number;
}
