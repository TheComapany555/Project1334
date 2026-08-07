import type { Metadata } from "next";

/**
 * Standing policy: listing pages, /search and the category views are kept out
 * of search engines.
 *
 * This is a deliberate product decision, NOT a coming-soon workaround — do not
 * make it conditional on `listings_coming_soon`. Listings stay excluded even
 * once they are publicly visible.
 *
 * `follow: true` is intentional: crawlers may still traverse these pages to
 * reach broker and agency profiles, which ARE indexed. Only indexing is
 * withheld, not discovery.
 *
 * Sitemap membership must stay in lockstep — a URL that is noindex here must
 * never appear in app/sitemap.ts, or the two signals contradict each other.
 */
export const NOINDEX_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: true,
};

/** Documentation anchor referenced from app/sitemap.ts. */
export const NOINDEX_REASON =
  "Listings, /search and category pages are excluded from search indexing by " +
  "standing policy; only the homepage, legal pages and real broker/agency " +
  "profiles are indexed.";
