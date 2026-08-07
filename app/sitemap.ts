import type { MetadataRoute } from "next";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import {
  isIndexableAgency,
  isIndexableBrokerProfile,
} from "@/lib/seo/profile-quality";

// Regenerate sitemap every hour
export const revalidate = 3600;

const SITE_URL = getSiteUrl();

type ChangeFrequency = NonNullable<
  MetadataRoute.Sitemap[number]["changeFrequency"]
>;

type SitemapEntry = MetadataRoute.Sitemap[number];

function entry(
  path: string,
  options: {
    lastModified?: string | Date | null;
    changeFrequency: ChangeFrequency;
    priority: number;
  },
): SitemapEntry {
  return {
    url: path.startsWith("http") ? path : `${SITE_URL}${path}`,
    lastModified: options.lastModified
      ? new Date(options.lastModified)
      : new Date(),
    changeFrequency: options.changeFrequency,
    priority: options.priority,
  };
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null;
}

/**
 * Public sitemap.
 *
 * Scope is deliberately narrow and fixed: the homepage, the legal pages, and
 * broker/agency profiles that carry real content. Individual listing pages,
 * /search and the category views are intentionally NOT indexed — see
 * `NOINDEX_REASON` in lib/seo/noindex.ts for the single source of that policy.
 *
 * This is a standing decision, not a coming-soon workaround: it must not start
 * emitting listing URLs when listings become publicly visible. Anything added
 * here must also be indexable in the page's own robots metadata, or the two
 * signals contradict each other.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceRoleClient();

  const [{ data: brokers }, { data: agencies }] = await Promise.all([
    supabase
      .from("profiles")
      .select("slug, updated_at, name, bio, photo_url, company")
      .eq("role", "broker")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("agencies")
      .select("slug, updated_at, name, bio, logo_url")
      .eq("status", "active")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false }),
  ]);

  const now = new Date();

  // /compare and /saved are excluded as well: both redirect signed-out visitors
  // to login, so a crawler never reaches indexable content there.
  const staticPages: MetadataRoute.Sitemap = [
    entry("/", { lastModified: now, changeFrequency: "daily", priority: 1 }),
    entry("/privacy", {
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    }),
    entry("/terms", {
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    }),
  ];

  // Broker pages. Gated on the shared quality rules so test accounts and thin
  // name-only profiles stay out — submitting them alongside real profiles is a
  // low-quality signal that suppresses crawling of the whole site.
  const brokerPages: MetadataRoute.Sitemap = (brokers ?? [])
    .filter((b) => isIndexableBrokerProfile(b))
    .map((b) =>
      b.slug
        ? entry(`/broker/${b.slug}`, {
            lastModified: b.updated_at,
            changeFrequency: "weekly",
            priority: 0.6,
          })
        : null,
    )
    .filter(isPresent);

  // Agency pages
  const agencyPages: MetadataRoute.Sitemap = (agencies ?? [])
    .filter((a) => isIndexableAgency(a))
    .map((a) =>
      a.slug
        ? entry(`/agency/${a.slug}`, {
            lastModified: a.updated_at,
            changeFrequency: "weekly",
            priority: 0.6,
          })
        : null,
    )
    .filter(isPresent);

  return [...staticPages, ...brokerPages, ...agencyPages];
}
