import type { MetadataRoute } from "next";
import { createServiceRoleClient } from "@/lib/supabase/admin";

// Regenerate sitemap every hour
export const revalidate = 3600;

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://salebiz.com.au";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceRoleClient();

  // Fetch all published listing slugs + updated dates
  const { data: listings } = await supabase
    .from("listings")
    .select("slug, updated_at, published_at")
    .eq("status", "published")
    .is("admin_removed_at", null)
    .order("published_at", { ascending: false });

  // Fetch all broker profile slugs
  const { data: brokers } = await supabase
    .from("profiles")
    .select("slug, updated_at")
    .not("slug", "is", null);

  // Fetch all active category slugs
  const { data: categories } = await supabase
    .from("categories")
    .select("slug")
    .eq("active", true);

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Listing pages
  const listingPages: MetadataRoute.Sitemap = (listings ?? []).map((l) => ({
    url: `${SITE_URL}/listing/${l.slug}`,
    lastModified: new Date(l.updated_at ?? l.published_at ?? Date.now()),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Broker pages
  const brokerPages: MetadataRoute.Sitemap = (brokers ?? [])
    .filter((b) => b.slug)
    .map((b) => ({
      url: `${SITE_URL}/broker/${b.slug}`,
      lastModified: new Date(b.updated_at ?? Date.now()),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  // Category search pages
  const categoryPages: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: `${SITE_URL}/search?category=${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...listingPages, ...brokerPages, ...categoryPages];
}
