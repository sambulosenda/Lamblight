/**
 * Versions shown in the version switcher.
 *
 * "self-hosted" versions live in data/<id>/ and get server-rendered, indexable
 * pages. "youversion" versions will be loaded in the browser through the
 * YouVersion Platform SDK once our app key is approved; they never get
 * server-rendered pages, because we plan as if caching is not allowed.
 */
export interface VersionInfo {
  id: string;
  abbreviation: string;
  name: string;
  source: "self-hosted" | "youversion";
  /** False until the data is imported (or the licence is approved). */
  available: boolean;
}

export const DEFAULT_VERSION = "bsb";

export const VERSIONS: VersionInfo[] = [
  { id: "bsb", abbreviation: "BSB", name: "Berean Standard Bible", source: "self-hosted", available: true },
  { id: "web", abbreviation: "WEB", name: "World English Bible", source: "self-hosted", available: true },
  { id: "kjv", abbreviation: "KJV", name: "King James Version", source: "self-hosted", available: true },
  { id: "asv", abbreviation: "ASV", name: "American Standard Version", source: "self-hosted", available: false },
  { id: "ylt", abbreviation: "YLT", name: "Young’s Literal Translation", source: "self-hosted", available: false },
];

export const AVAILABLE_VERSIONS = VERSIONS.filter((v) => v.available && v.source === "self-hosted");

export function versionById(id: string): VersionInfo | undefined {
  return VERSIONS.find((v) => v.id === id.toLowerCase());
}
