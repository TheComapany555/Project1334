import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXTAUTH_URL ?? "https://salebiz.com.au").replace(
  /\/$/,
  "",
);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/account/",
          "/admin/",
          "/api/",
          "/auth/",
          "/checkout/",
          "/dashboard/",
          "/invite/",
          "/saved/",
          "/site-locked/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
