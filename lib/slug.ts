import { nanoid } from "nanoid";
import slugify from "slugify";

const slugifyOptions = { lower: true, strict: true };

/** Pure helper: generate a URL-safe slug from a name. Safe to use on client or server. */
export function generateSlugFromName(name: string): string {
  const base = slugify(name, slugifyOptions);
  return base || "broker";
}

/** Generate unique listing slug: title slug + 6-char id. */
export function generateListingSlug(title: string): string {
  const base = slugify(title, slugifyOptions);
  const safe = base || "listing";
  return `${safe}-${nanoid(6)}`;
}
