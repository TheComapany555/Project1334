import type { MetadataRoute } from "next";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceRoleClient();

  // Fetch all published listing slugs + updated dates
  const [
    { data: listings },
    { data: brokers },
    { data: agencies },
    { data: categories },
    { data: subcategories },
  ] = await Promise.all([
    supabase
      .from("listings")
      .select("slug, updated_at, published_at")
      .eq("status", "published")
      .eq("is_private", false)
      .is("admin_removed_at", null)
      .not("slug", "is", null)
      .order("published_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("slug, updated_at")
      .eq("role", "broker")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("agencies")
      .select("slug, updated_at")
      .eq("status", "active")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("categories")
      .select("slug")
      .eq("active", true)
      .not("slug", "is", null)
      .order("sort_order", { ascending: true }),
    supabase
      .from("subcategories")
      .select("id")
      .eq("active", true)
      .order("name", { ascending: true }),
  ]);

  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    entry("/", { lastModified: now, changeFrequency: "daily", priority: 1 }),
    entry("/search", {
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    }),
    entry("/compare", {
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    }),
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

  // Listing pages
  const listingPages: MetadataRoute.Sitemap = (listings ?? [])
    .map((l) =>
      l.slug
        ? entry(`/listing/${l.slug}`, {
            lastModified: l.updated_at ?? l.published_at,
            changeFrequency: "weekly",
            priority: 0.8,
          })
        : null,
    )
    .filter(isPresent);

  // Broker pages
  const brokerPages: MetadataRoute.Sitemap = (brokers ?? [])
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

  // Category search pages
  const categoryPages: MetadataRoute.Sitemap = (categories ?? [])
    .map((c) =>
      c.slug
        ? entry(`/search?category=${encodeURIComponent(c.slug)}`, {
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.7,
          })
        : null,
    )
    .filter(isPresent);

  // Subcategory search pages. The app filters these by id because slugs can
  // repeat across parent categories.
  const subcategoryPages: MetadataRoute.Sitemap = (subcategories ?? []).map(
    (s) =>
      entry(`/search?subcategory=${encodeURIComponent(s.id)}`, {
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.65,
      }),
  );

  return [
    ...staticPages,
    ...listingPages,
    ...brokerPages,
    ...agencyPages,
    ...categoryPages,
    ...subcategoryPages,
  ];
}
