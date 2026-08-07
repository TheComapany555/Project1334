/**
 * Shared "is this page worth indexing?" rules for public profile pages.
 *
 * Broker and agency pages are the only public surface that exists independently
 * of listings, so while listings are hidden they are most of what Google sees.
 * Test accounts and empty profiles submitted alongside real ones read as a
 * low-quality site and depress crawling of everything else, so both the sitemap
 * and the pages' robots metadata gate on the same rules here. Keeping the two
 * in one module stops them drifting apart — a URL that is noindex must never
 * still appear in the sitemap.
 */

const TEST_WORDS =
  "test|testing|tester|demo|sample|dummy|example|placeholder|foobar|asdf|qwerty|lorem";

/**
 * Obvious non-production accounts, matched two ways:
 *
 *  1. a test word as its own delimited segment  — "test", "test-broker-on-board"
 *  2. a test word directly prefixing a role/entity word — "testbroker",
 *     "testbusiness", "demoagency" — which carry no delimiter to key off.
 *
 * Both are deliberately anchored so ordinary names survive: "greatest-deals",
 * "Contest Group", "Attestation Services" and "Westest" are all kept. The cost
 * of a false positive (a real broker silently deindexed) is far higher than a
 * false negative, so the patterns stay narrow rather than clever.
 */
const TEST_SEGMENT = new RegExp(`(^|[^a-z])(${TEST_WORDS})([^a-z]|$)`, "i");
const TEST_PREFIXED = new RegExp(
  `(^|[^a-z])(${TEST_WORDS})[-_ ]?(broker|business|agency|agent|account|user|company|co|corp|listing|profile|firm|group)([^a-z]|$)`,
  "i",
);

export function looksLikeTestAccount(
  ...values: Array<string | null | undefined>
): boolean {
  return values.some((v) =>
    v ? TEST_SEGMENT.test(v) || TEST_PREFIXED.test(v) : false,
  );
}

export type IndexableProfile = {
  slug: string | null;
  name?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  company?: string | null;
};

/**
 * A broker profile earns indexing when it is not a test account and carries
 * enough unique content to be worth a search result — a real bio, a photo, or
 * a stated company. A bare name-and-slug page is thin content.
 */
export function isIndexableBrokerProfile(
  profile: IndexableProfile,
  { hasListings = false }: { hasListings?: boolean } = {},
): boolean {
  if (!profile.slug) return false;
  if (looksLikeTestAccount(profile.slug, profile.name, profile.company)) {
    return false;
  }
  // An active listing is itself proof the profile is real and useful.
  if (hasListings) return true;
  const hasBio = (profile.bio?.trim().length ?? 0) >= 40;
  const hasPhoto = Boolean(profile.photo_url?.trim());
  const hasCompany = Boolean(profile.company?.trim());
  return hasBio || hasPhoto || hasCompany;
}

export type IndexableAgency = {
  slug: string | null;
  name?: string | null;
  bio?: string | null;
  logo_url?: string | null;
};

export function isIndexableAgency(
  agency: IndexableAgency,
  { hasListings = false }: { hasListings?: boolean } = {},
): boolean {
  if (!agency.slug) return false;
  if (looksLikeTestAccount(agency.slug, agency.name)) return false;
  if (hasListings) return true;
  const hasBio = (agency.bio?.trim().length ?? 0) >= 40;
  const hasLogo = Boolean(agency.logo_url?.trim());
  return hasBio || hasLogo;
}
