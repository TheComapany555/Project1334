import { SignJWT, jwtVerify } from "jose";

// Pre-launch site-wide password gate. The shared password (bcrypt-hashed) lives
// in the `site_access_gate` table; once a visitor enters it correctly the unlock
// API issues this short signed cookie so the edge middleware can let them
// through without hitting the DB on every request. Mirrors lib/mobile-jwt.ts.

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

/** Cookie that marks a visitor as having passed the site gate. */
export const SITE_GATE_COOKIE = "salebiz_site_access";

/**
 * Hard ceiling on how long one unlock can stay valid even if the browser is
 * left open. The cookie itself is SESSION-scoped (no Max-Age) so it clears when
 * the browser closes — so visitors re-enter the password every time they come
 * back to the site, not just the first time ever.
 */
const SITE_GATE_TOKEN_TTL = "12h";

/** True when the gate should be enforced. Off by default to avoid lockouts. */
export function isSiteGateEnabled(): boolean {
  return process.env.SITE_GATE_ENABLED === "true";
}

/** Issue a signed access token to drop in the (session-scoped) gate cookie. */
export async function signSiteAccessToken(): Promise<string> {
  return new SignJWT({ gate: "site" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SITE_GATE_TOKEN_TTL)
    .sign(secret);
}

/** Edge-safe verification of the gate cookie. Returns true if it's valid. */
export async function verifySiteAccessToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}
