/**
 * Gmail Connected Inbox OAuth callback.
 *
 * Google redirects here with `?code=...&state=...`. We:
 *   1. Validate state matches the cookie we set on /connect
 *   2. Exchange code → tokens
 *   3. Fetch the connecting user's Google email (so we know which mailbox)
 *   4. Persist encrypted tokens on broker_email_accounts
 *   5. Redirect to /dashboard/profile?connected=gmail
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  exchangeCodeForTokens,
  fetchUserInfo,
  isGmailOAuthConfigured,
  persistGmailConnection,
} from "@/lib/email/gmail-oauth";
import { isEmailTokenCryptoConfigured } from "@/lib/crypto/email-tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
  if (!isGmailOAuthConfigured() || !isEmailTokenCryptoConfigured()) {
    return NextResponse.redirect(
      new URL("/dashboard/profile?connect_error=not_configured", req.url),
    );
  }

  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  const state = sp.get("state");
  const error = sp.get("error");
  // Land on the actual workspace tab so the ConnectedInboxCard sees the
  // query param and fires its success/error toast. /dashboard/profile is a
  // bare redirect that strips query strings.
  const RETURN_PATH = "/dashboard/workspace?tab=profile";
  if (error) {
    return NextResponse.redirect(
      new URL(`${RETURN_PATH}&connect_error=${encodeURIComponent(error)}`, req.url),
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`${RETURN_PATH}&connect_error=missing_params`, req.url),
    );
  }

  const jar = await cookies();
  const cookieState = jar.get("salebiz_oauth_state")?.value;
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(
      new URL(`${RETURN_PATH}&connect_error=state_mismatch`, req.url),
    );
  }
  // Consume the state cookie regardless of outcome.
  jar.delete("salebiz_oauth_state");

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Google only returns refresh_token on first consent OR when
      // prompt=consent is used. We always pass prompt=consent so this is
      // unexpected — most likely a misconfigured OAuth app.
      return NextResponse.redirect(
        new URL(`${RETURN_PATH}&connect_error=missing_refresh_token`, req.url),
      );
    }
    const info = await fetchUserInfo(tokens.access_token);
    await persistGmailConnection({
      brokerId: session.user.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresInSeconds: tokens.expires_in,
      scopes: tokens.scope.split(" ").filter(Boolean),
      email: info.email,
      displayName: info.name,
    });
    return NextResponse.redirect(
      new URL(`${RETURN_PATH}&connected=gmail`, req.url),
    );
  } catch (e) {
    // Surface the underlying cause when Node's fetch wraps a network error
    // as the unhelpful "fetch failed". The cause typically contains the real
    // ECONNREFUSED / ENOTFOUND / handshake error.
    let message = e instanceof Error ? e.message : "unknown";
    if (e instanceof Error && "cause" in e && e.cause) {
      const cause = e.cause as { code?: string; message?: string };
      if (cause.code || cause.message) {
        message = `${message} (${cause.code ?? ""} ${cause.message ?? ""})`.trim();
      }
    }
    // Also log to the dev server console so devs can see it without URL hunting.
    console.error("[gmail-oauth callback] failed:", e);
    return NextResponse.redirect(
      new URL(
        `${RETURN_PATH}&connect_error=${encodeURIComponent(message)}`,
        req.url,
      ),
    );
  }
}
