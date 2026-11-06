import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { AVAILABLE_VERSIONS } from "@/lib/versions";

export default function robots(): MetadataRoute.Robots {
  const count = 1 + AVAILABLE_VERSIONS.length * 2;
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/go", "/search"] },
    sitemap: Array.from({ length: count }, (_, i) => `${SITE_URL}/sitemap/${i}.xml`),
  };
}
