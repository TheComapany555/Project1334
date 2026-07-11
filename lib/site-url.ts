const PRODUCTION_SITE_URL = "https://salebiz.com.au";

export function getSiteUrl(): string {
  const rawUrl = process.env.NEXTAUTH_URL ?? PRODUCTION_SITE_URL;

  try {
    const url = new URL(rawUrl);
    if (
      url.hostname === "salebiz.com.au" ||
      url.hostname === "www.salebiz.com.au"
    ) {
      return PRODUCTION_SITE_URL;
    }
    return url.origin.replace(/\/$/, "");
  } catch {
    return PRODUCTION_SITE_URL;
  }
}
