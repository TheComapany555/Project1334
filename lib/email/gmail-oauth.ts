/**
 * Gmail OAuth 2.0 helpers — Connected Inbox for the broker email composer.
 *
 * We use Google's standard authorization-code flow with `access_type=offline`
 * to get a refresh token. Tokens stored encrypted on `broker_email_accounts`
 * via `lib/crypto/email-tokens.ts`.
 *
 * Scopes:
 *   - openid + email + profile  → identify which Google account connected
 *   - gmail.send                → send-only (no inbox read access)
 *
 * Using `gmail.send` keeps the OAuth review lighter (still a Google
 * "restricted" scope, but less invasive than `gmail.readonly`). If you later
 * want to also poll Sent folder for messages composed outside Salebiz, add
 * `gmail.readonly` and request fresh consent.
 */

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { encryptToken, decryptToken } from "@/lib/crypto/email-tokens";

const GOOGLE_OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL =
  "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.send",
];

export type GmailOAuthEnv = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function getGmailOAuthEnv(): GmailOAuthEnv | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ??
    `${base.replace(/\/$/, "")}/api/auth/google/callback`;
  return { clientId, clientSecret, redirectUri };
}

export function isGmailOAuthConfigured(): boolean {
  return !!getGmailOAuthEnv();
}

/**
 * Build Google's consent URL. `state` is a CSRF-defending nonce we round-trip
 * and verify in the callback.
 */
export function buildAuthorizeUrl(state: string): string {
  const env = getGmailOAuthEnv();
  if (!env) throw new Error("Gmail OAuth not configured");
  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    // `prompt=consent` forces a refresh-token issuance every time. Without
    // it, Google only returns a refresh_token on the very first consent.
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${GOOGLE_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number; // seconds
  refresh_token?: string;
  scope: string;
  token_type: "Bearer";
  id_token?: string;
};

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const env = getGmailOAuthEnv();
  if (!env) throw new Error("Gmail OAuth not configured");
  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.clientId,
      client_secret: env.clientSecret,
      redirect_uri: env.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Token exchange failed: ${res.status} ${txt}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function fetchUserInfo(accessToken: string): Promise<{
  email: string;
  name: string | null;
  picture: string | null;
}> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`User info fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    email?: string;
    name?: string | null;
    picture?: string | null;
  };
  if (!data.email) throw new Error("User info missing email");
  return {
    email: data.email,
    name: data.name ?? null,
    picture: data.picture ?? null,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  scope: string;
}> {
  const env = getGmailOAuthEnv();
  if (!env) throw new Error("Gmail OAuth not configured");
  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.clientId,
      client_secret: env.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Refresh failed: ${res.status} ${txt}`);
  }
  return (await res.json()) as {
    access_token: string;
    expires_in: number;
    scope: string;
  };
}

/**
 * Persist a successful connection. Called by the OAuth callback after we've
 * exchanged the code + fetched user info.
 *
 * Throws on DB error so the callback's catch block surfaces the real reason
 * (most common: the migration wasn't applied → "relation ... does not exist").
 */
export async function persistGmailConnection(args: {
  brokerId: string;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  scopes: string[];
  email: string;
  displayName: string | null;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  const expiresAt = new Date(Date.now() + args.expiresInSeconds * 1000);
  const { error } = await supabase
    .from("broker_email_accounts")
    .upsert(
      {
        broker_id: args.brokerId,
        provider: "gmail",
        email_address: args.email,
        display_name: args.displayName,
        access_token_enc: encryptToken(args.accessToken),
        refresh_token_enc: encryptToken(args.refreshToken),
        access_expires_at: expiresAt.toISOString(),
        scopes: args.scopes,
        status: "active",
        last_synced_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "broker_id,provider" },
    );
  if (error) {
    throw new Error(`DB upsert failed: ${error.message} (code=${error.code})`);
  }
}

/**
 * Return a valid access token for the broker, refreshing if needed. Returns
 * null when the broker hasn't connected Gmail (or refresh is irrecoverable).
 */
export async function getValidGmailAccessToken(
  brokerId: string,
): Promise<{ accessToken: string; emailAddress: string; displayName: string | null } | null> {
  const supabase = createServiceRoleClient();
  const { data: row } = await supabase
    .from("broker_email_accounts")
    .select(
      "id, email_address, display_name, access_token_enc, refresh_token_enc, access_expires_at, status",
    )
    .eq("broker_id", brokerId)
    .eq("provider", "gmail")
    .maybeSingle();
  if (!row || row.status !== "active") return null;
  if (!row.refresh_token_enc) return null;

  const now = Date.now();
  const expiresAt = row.access_expires_at
    ? new Date(row.access_expires_at).getTime()
    : 0;

  // Refresh if we're within 60s of expiry (or already expired).
  if (!row.access_token_enc || now > expiresAt - 60_000) {
    try {
      const refreshed = await refreshAccessToken(decryptToken(row.refresh_token_enc));
      const newExpiry = new Date(now + refreshed.expires_in * 1000);
      await supabase
        .from("broker_email_accounts")
        .update({
          access_token_enc: encryptToken(refreshed.access_token),
          access_expires_at: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", row.id);
      return {
        accessToken: refreshed.access_token,
        emailAddress: row.email_address,
        displayName: row.display_name as string | null,
      };
    } catch (e) {
      await supabase
        .from("broker_email_accounts")
        .update({
          status: "error",
          last_error: e instanceof Error ? e.message : String(e),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      return null;
    }
  }

  return {
    accessToken: decryptToken(row.access_token_enc),
    emailAddress: row.email_address,
    displayName: row.display_name as string | null,
  };
}

/** Revoke + delete the broker's Gmail connection. */
export async function disconnectGmail(brokerId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data: row } = await supabase
    .from("broker_email_accounts")
    .select("id, refresh_token_enc")
    .eq("broker_id", brokerId)
    .eq("provider", "gmail")
    .maybeSingle();
  if (!row) return;

  // Best-effort revoke on Google's side.
  if (row.refresh_token_enc) {
    try {
      await fetch(GOOGLE_REVOKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: decryptToken(row.refresh_token_enc) }),
      });
    } catch {
      // Don't block disconnect on a revocation failure — drop the row anyway.
    }
  }

  await supabase.from("broker_email_accounts").delete().eq("id", row.id);
}
