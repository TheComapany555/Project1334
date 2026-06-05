import { SignJWT, jwtVerify } from "jose";

// Pre-launch site-wide password gate. The shared password (bcrypt-hashed) lives
// in the `site_access_gate` table; once a visitor enters it correctly the unlock
// API issues this short signed cookie so the edge middleware can let them
// through without hitting the DB on every request. Mirrors lib/mobile-jwt.ts.

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

/** Cookie that marks a visitor as having passed the site gate. */
export const SITE_GATE_COOKIE = "salebiz_site_access";

/** How long a successful unlock lasts before the visitor must re-enter it. */
export const SITE_GATE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** True when the gate should be enforced. Off by default to avoid lockouts. */
export function isSiteGateEnabled(): boolean {
  return process.env.SITE_GATE_ENABLED === "true";
}

/** Issue a signed access token to drop in the gate cookie. */
export async function signSiteAccessToken(): Promise<string> {
  return new SignJWT({ gate: "site" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
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
