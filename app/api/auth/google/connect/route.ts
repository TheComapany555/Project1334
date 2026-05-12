/**
 * Kick off the Gmail Connected Inbox OAuth flow.
 *
 * Auth: broker only. We generate a CSRF `state`, stash it in an httpOnly
 * cookie, and 302 the user to Google's consent screen. The callback route
 * validates the state matches.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildAuthorizeUrl, isGmailOAuthConfigured } from "@/lib/email/gmail-oauth";
import { isEmailTokenCryptoConfigured } from "@/lib/crypto/email-tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGmailOAuthConfigured() || !isEmailTokenCryptoConfigured()) {
    return NextResponse.json(
      { error: "Connected Inbox is not configured on this server." },
      { status: 503 },
    );
  }

  const state = nanoid(32);
  const jar = await cookies();
  jar.set("salebiz_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
