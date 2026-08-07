import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const SITE_URL = getSiteUrl();

/**
 * Public sitemap — static pages only.
 *
 * Standing policy: the only URLs submitted to search engines are the homepage
 * and the legal pages. Everything database-driven — listings, /search and its
 * category views, and broker/agency profiles — is deliberately excluded and
 * carries `noindex` in its own metadata (see lib/seo/noindex.ts).
 *
 * This is a fixed product decision, NOT a coming-soon workaround: it must not
 * become conditional on `listings_coming_soon`, and it must not grow to include
 * profile or listing URLs. Anything added here has to be indexable in the
 * page's own robots metadata too, or the two signals contradict each other.
 *
 * Because nothing here is dynamic, this route needs no database access and no
 * revalidation window.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
