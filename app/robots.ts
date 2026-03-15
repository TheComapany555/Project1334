import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://salebiz.com.au";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/admin/", "/api/", "/auth/", "/checkout/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
