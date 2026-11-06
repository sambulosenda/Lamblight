/**
 * Verse of the day rotation. A hand-picked list, cycled by day of the year (UTC).
 * Replace with an editorial calendar later; keep entries as canonical IDs.
 */
export const VOTD_ROTATION = [
  "PSA.119.105", "JHN.3.16", "PHP.4.6", "ISA.41.10", "ROM.8.28", "JER.29.11", "PRO.3.5", "MAT.11.28",
  "PSA.23.1", "JOS.1.9", "ROM.12.2", "2CO.5.17", "GAL.2.20", "EPH.2.8", "PHP.4.13", "HEB.11.1",
  "1PE.5.7", "PSA.46.1", "ISA.40.31", "MAT.6.33", "JHN.14.6", "ROM.5.8", "1JN.1.9", "PSA.37.4",
  "LAM.3.22", "2TI.1.7", "COL.3.23", "JAS.1.5", "MIC.6.8", "PSA.121.1", "ZEP.3.17",
];

export function votdForDate(date: Date): { code: string; chapter: number; verse: number } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  const [code, chapter, verse] = VOTD_ROTATION[day % VOTD_ROTATION.length].split(".");
  return { code, chapter: Number(chapter), verse: Number(verse) };
}
