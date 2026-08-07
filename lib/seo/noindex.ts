import type { Metadata } from "next";

/**
 * Standing policy: only the homepage and the legal pages (/privacy, /terms) are
 * indexed. Everything database-driven is kept out of search engines — listing
 * pages, /search and its category views, and broker/agency profiles.
 *
 * This is a deliberate product decision, NOT a coming-soon workaround — do not
 * make it conditional on `listings_coming_soon`. These pages stay excluded even
 * once listings are publicly visible.
 *
 * `follow: true` is intentional: crawlers may still traverse these pages to
 * reach the indexed static pages. Only indexing is withheld, not discovery.
 *
 * Sitemap membership must stay in lockstep — app/sitemap.ts lists the static
 * pages only, and nothing marked noindex here may be added to it.
 */
export const NOINDEX_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: true,
};

/** Documentation anchor referenced from app/sitemap.ts. */
export const NOINDEX_REASON =
  "Only the homepage and legal pages are indexed by standing policy; listings, " +
  "/search, category views and broker/agency profiles are all excluded.";
