import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Bible JSON is read from disk at runtime for verse pages rendered on first visit.
  outputFileTracingIncludes: {
    "/[version]/[book]/[chapter]/[verse]": ["./data/**/*.json"],
    "/[version]/[book]/[chapter]": ["./data/**/*.json"],
    "/search": ["./data/**/*.json"],
    "/sitemap/[__metadata_id__]": ["./data/**/*.json"],
  },
};

export default nextConfig;
