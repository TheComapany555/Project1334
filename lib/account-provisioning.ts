// Shared helpers for provisioning broker accounts when an admin or agency owner
// creates them directly (no OTP). Not a "use server" file — these are
// internal helpers used by server actions in lib/actions/*.

import { nanoid } from "nanoid";
import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { accountCreatedByAdminEmail } from "@/lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);
const WELCOME_EMAIL_FROM = "welcome@salebiz.com.au";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const SET_PASSWORD_EXPIRY_DAYS = 7;

export type CreateSetPasswordTokenResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

/**
 * Issue a single-use `set_password` token (7-day TTL) for a freshly-created user.
 * Invalidates any prior set_password token for the same user.
 */
export async function createSetPasswordToken(
  userId: string,
): Promise<CreateSetPasswordTokenResult> {
  const supabase = createServiceRoleClient();
  await supabase.from("auth_tokens").delete().eq("user_id", userId).eq("type", "set_password");

  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + SET_PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("auth_tokens").insert({
    user_id: userId,
    type: "set_password",
    token,
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    // Most likely cause: the 'set_password' type has not been added to the
    // auth_tokens.type CHECK constraint yet (migration 20260528000001 not applied).
    return {
      ok: false,
      error: `Could not create set-password token: ${error.message}. Make sure migration 20260528000001_admin_account_creation.sql is applied to your database.`,
    };
  }
  return { ok: true, token };
}

export function buildSetPasswordUrl(token: string): string {
  return `${APP_URL}/auth/set-password?token=${token}`;
}

export async function sendSetPasswordEmail(opts: {
  email: string;
  name: string | null;
  setPasswordUrl: string;
  agencyName: string | null;
  /** Human-readable label for "created by …" line in the email body. */
  createdByLabel: string;
  /** Affects copy: agency owner vs. broker joining an existing agency. */
  isAgencyOwner: boolean;
}): Promise<void> {
  await resend.emails.send({
    from: WELCOME_EMAIL_FROM,
    to: opts.email,
    subject: "Your Salebiz account is ready — set your password",
    html: accountCreatedByAdminEmail({
      name: opts.name,
      setPasswordUrl: opts.setPasswordUrl,
      agencyName: opts.agencyName,
      createdByLabel: opts.createdByLabel,
      isAgencyOwner: opts.isAgencyOwner,
      expiresInDays: SET_PASSWORD_EXPIRY_DAYS,
    }),
  }).catch(() => {});
}
