/**
 * Word-level comparison of two translations of the same verse, for Compare's
 * "shade the differences". Words are matched ignoring case and punctuation, so
 * "Him," and "him" count as the same word.
 */
export interface DiffPart {
  text: string;
  /** True when this run of words isn't in the other version. */
  differs: boolean;
}

const key = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** Split `a` into runs that do or don't appear, in order, in `b` (longest common subsequence of words). */
export function diffWords(a: string, b: string): DiffPart[] {
  const aw = a.split(/\s+/).filter(Boolean);
  const bw = b.split(/\s+/).filter(Boolean);
  const ak = aw.map(key);
  const bk = bw.map(key);
  // lcs[i][j]: length of the common subsequence of ak[i..] and bk[j..]
  const lcs: number[][] = Array.from({ length: ak.length + 1 }, () => new Array<number>(bk.length + 1).fill(0));
  for (let i = ak.length - 1; i >= 0; i--) {
    for (let j = bk.length - 1; j >= 0; j--) {
      lcs[i][j] = ak[i] && ak[i] === bk[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const same: boolean[] = [];
  let i = 0;
  let j = 0;
  while (i < ak.length) {
    if (j < bk.length && ak[i] && ak[i] === bk[j]) {
      same.push(true);
      i++;
      j++;
    } else if (j < bk.length && lcs[i][j + 1] >= lcs[i + 1][j]) {
      j++;
    } else {
      // A bare punctuation mark ("—") is never shaded on its own.
      same.push(!ak[i]);
      i++;
    }
  }
  const parts: DiffPart[] = [];
  aw.forEach((w, n) => {
    const differs = !same[n];
    const last = parts[parts.length - 1];
    if (last && last.differs === differs) last.text += ` ${w}`;
    else parts.push({ text: parts.length ? ` ${w}` : w, differs });
  });
  // Keep the space between runs outside the shading.
  for (const p of parts) {
    if (p.differs && p.text.startsWith(" ")) {
      p.text = p.text.slice(1);
      const idx = parts.indexOf(p);
      parts[idx - 1].text += " ";
    }
  }
  return parts;
}
