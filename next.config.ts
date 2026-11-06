import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Bible JSON is read from disk at runtime for verse pages rendered on first visit.
  outputFileTracingIncludes: {
    "/[version]/[book]/[chapter]/[verse]": ["./data/bsb/**/*.json"],
    "/[version]/[book]/[chapter]/[verse]/study": ["./data/bsb/**/*.json", "./data/study/*.json"],
    "/[version]/[book]/[chapter]": ["./data/bsb/**/*.json"],
    "/search": ["./data/bsb/**/*.json"],
    "/topics/[slug]": ["./data/bsb/**/*.json"],
    "/sitemap/[__metadata_id__]": ["./data/bsb/**/*.json"],
    "/img/[version]/[book]/[chapter]/[verse]": ["./data/bsb/**/*.json", "./assets/fonts/*.ttf"],
  },
};

export default nextConfig;
