"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  buildAuthorizeUrl,
  disconnectGmail,
  isGmailOAuthConfigured,
} from "@/lib/email/gmail-oauth";
import { isEmailTokenCryptoConfigured } from "@/lib/crypto/email-tokens";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";

export type ConnectedEmailAccount = {
  provider: "gmail" | "outlook";
  email_address: string;
  display_name: string | null;
  status: "active" | "revoked" | "error";
  last_error: string | null;
  connected_at: string;
};

async function requireBroker() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return { id: session.user.id };
}

/** Check whether the platform has OAuth configured at all. */
export async function isConnectedInboxEnabled(): Promise<boolean> {
  return isGmailOAuthConfigured() && isEmailTokenCryptoConfigured();
}

/**
 * Build the OAuth start URL + store a CSRF state nonce in a short-lived
 * cookie. The callback validates the returned `state` matches.
 */
export async function startGmailConnect(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  await requireBroker();
  if (!isGmailOAuthConfigured()) {
    return {
      ok: false,
      error: "Gmail connect isn't configured yet (missing GOOGLE_CLIENT_ID / SECRET).",
    };
  }
  if (!isEmailTokenCryptoConfigured()) {
    return {
      ok: false,
      error:
        "Token encryption isn't configured (missing EMAIL_TOKEN_ENCRYPTION_KEY).",
    };
  }
  const state = nanoid(32);
  const jar = await cookies();
  jar.set("salebiz_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 minutes
  });
  return { ok: true, url: buildAuthorizeUrl(state) };
}

/** Read-only status for the connected-inbox card. */
export async function getConnectedEmailAccount(): Promise<ConnectedEmailAccount | null> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("broker_email_accounts")
    .select(
      "provider, email_address, display_name, status, last_error, created_at",
    )
    .eq("broker_id", broker.id)
    .maybeSingle();
  if (!data) return null;
  return {
    provider: data.provider as "gmail" | "outlook",
    email_address: data.email_address as string,
    display_name: (data.display_name as string | null) ?? null,
    status: data.status as "active" | "revoked" | "error",
    last_error: (data.last_error as string | null) ?? null,
    connected_at: data.created_at as string,
  };
}

/** Disconnect the broker's connected inbox. Revokes the refresh token. */
export async function disconnectInbox(
  provider: "gmail" | "outlook" = "gmail",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const broker = await requireBroker();
  try {
    if (provider === "gmail") {
      await disconnectGmail(broker.id);
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
