/**
 * Curated topic pages ("Verses about anxiety"). Each verse is a canonical ID,
 * optionally with a range end in the same chapter: "PHP.4.6-7".
 * Keep each list short and well known; the order is the order shown.
 */
export interface Topic {
  slug: string;
  name: string;
  /** One line under the title. */
  intro: string;
  verses: string[];
}

export const TOPICS: Topic[] = [
  {
    slug: "anxiety",
    name: "Anxiety",
    intro: "For days when worry is loud.",
    verses: ["PHP.4.6-7", "1PE.5.7", "MAT.6.34", "MAT.11.28-30", "PSA.94.19", "ISA.41.10", "JHN.14.27", "PSA.55.22", "PRO.12.25", "PSA.56.3"],
  },
  {
    slug: "hope",
    name: "Hope",
    intro: "Promises to hold on to.",
    verses: ["ROM.15.13", "JER.29.11", "ISA.40.31", "ROM.5.3-5", "LAM.3.22-23", "HEB.11.1", "PSA.42.11", "ROM.8.28", "HEB.6.19", "1PE.1.3"],
  },
  {
    slug: "strength",
    name: "Strength",
    intro: "When you have nothing left.",
    verses: ["PHP.4.13", "ISA.40.29", "2CO.12.9", "PSA.46.1", "NEH.8.10", "JOS.1.9", "PSA.28.7", "EPH.6.10", "PSA.73.26", "DEU.31.6"],
  },
  {
    slug: "grief",
    name: "Grief",
    intro: "Comfort for loss and sorrow.",
    verses: ["PSA.34.18", "MAT.5.4", "REV.21.4", "PSA.147.3", "JHN.11.25-26", "2CO.1.3-4", "1TH.4.13-14", "PSA.23.4", "ISA.53.4", "JHN.16.22"],
  },
  {
    slug: "peace",
    name: "Peace",
    intro: "Quiet for a restless heart.",
    verses: ["JHN.14.27", "ISA.26.3", "COL.3.15", "NUM.6.24-26", "JHN.16.33", "PSA.4.8", "ROM.5.1", "2TH.3.16", "MAT.5.9", "PSA.29.11"],
  },
  {
    slug: "love",
    name: "Love",
    intro: "God’s love, and how we love others.",
    verses: ["1CO.13.4-7", "JHN.3.16", "1JN.4.7-8", "ROM.8.38-39", "JHN.15.13", "1JN.4.19", "ROM.5.8", "1PE.4.8", "JHN.13.34-35", "ZEP.3.17"],
  },
  {
    slug: "forgiveness",
    name: "Forgiveness",
    intro: "Being forgiven, and forgiving.",
    verses: ["1JN.1.9", "EPH.4.32", "COL.3.13", "PSA.103.12", "MAT.6.14-15", "ISA.1.18", "MIC.7.18-19", "ACT.3.19", "LUK.6.37", "MAT.18.21-22"],
  },
  {
    slug: "fear",
    name: "Fear",
    intro: "Courage when you are afraid.",
    verses: ["ISA.41.10", "2TI.1.7", "PSA.27.1", "JOS.1.9", "PSA.23.4", "1JN.4.18", "DEU.31.8", "PSA.118.6", "ISA.43.1", "MRK.5.36"],
  },
];

/** Topics shown on the home page. */
export const HOME_TOPICS = ["anxiety", "hope", "strength", "grief"];

export function topicBySlug(slug: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug);
}

export interface TopicVerseRef {
  code: string;
  chapter: number;
  start: number;
  end: number;
}

export function parseTopicVerse(id: string): TopicVerseRef {
  const m = id.match(/^([1-3A-Z]{3})\.(\d+)\.(\d+)(?:-(\d+))?$/);
  if (!m) throw new Error(`Bad topic verse id ${id}`);
  const start = Number(m[3]);
  return { code: m[1], chapter: Number(m[2]), start, end: m[4] ? Number(m[4]) : start };
}
