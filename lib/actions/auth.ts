"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export type RegisterResult = { ok: true } | { ok: false; error: string };

export async function register(formData: FormData): Promise<RegisterResult> {
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from("users").select("id").eq("email", email).single();
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      email,
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !newUser) {
    return { ok: false, error: "Failed to create account. Please try again." };
  }

  await supabase.from("profiles").insert({
    id: newUser.id,
    role: "broker",
    updated_at: new Date().toISOString(),
  });

  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await supabase.from("auth_tokens").insert({
    user_id: newUser.id,
    type: "email_verification",
    token,
    expires_at: expiresAt.toISOString(),
  });

  const verifyUrl = `${APP_URL}/auth/verify?token=${token}`;
  await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "Verify your Salebiz account",
    html: getVerificationEmailHtml(verifyUrl, name ?? "there"),
  }).catch(() => {}); // don't block registration if email fails

  return { ok: true };
}

export async function verifyEmailToken(token: string): Promise<{ ok: boolean; error?: string }> {
  if (!token) return { ok: false, error: "Invalid link." };
  const supabase = createServiceRoleClient();
  const { data: row } = await supabase
    .from("auth_tokens")
    .select("user_id, expires_at")
    .eq("token", token)
    .eq("type", "email_verification")
    .single();
  if (!row || new Date(row.expires_at) < new Date()) {
    return { ok: false, error: "Link expired or invalid." };
  }
  await supabase.from("users").update({
    email_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", row.user_id);
  await supabase.from("auth_tokens").delete().eq("token", token);
  return { ok: true };
}

export async function requestPasswordReset(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  if (!email) return { ok: false, error: "Email is required." };

  const supabase = createServiceRoleClient();
  const { data: user } = await supabase.from("users").select("id").eq("email", email).single();
  if (!user) {
    // Don't reveal whether email exists
    return { ok: true };
  }

  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
  await supabase.from("auth_tokens").delete().eq("user_id", user.id).eq("type", "password_reset");
  await supabase.from("auth_tokens").insert({
    user_id: user.id,
    type: "password_reset",
    token,
    expires_at: expiresAt.toISOString(),
  });

  const resetUrl = `${APP_URL}/auth/reset?token=${token}`;
  await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "Reset your Salebiz password",
    html: getPasswordResetEmailHtml(resetUrl),
  }).catch(() => {});

  return { ok: true };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  if (!token || newPassword.length < 8) {
    return { ok: false, error: "Invalid link or password too short." };
  }
  const supabase = createServiceRoleClient();
  const { data: row } = await supabase
    .from("auth_tokens")
    .select("user_id, expires_at")
    .eq("token", token)
    .eq("type", "password_reset")
    .single();
  if (!row || new Date(row.expires_at) < new Date()) {
    return { ok: false, error: "Link expired or invalid." };
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await supabase.from("users").update({
    password_hash: passwordHash,
    updated_at: new Date().toISOString(),
  }).eq("id", row.user_id);
  await supabase.from("auth_tokens").delete().eq("token", token);
  return { ok: true };
}

function getVerificationEmailHtml(verifyUrl: string, name: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#333;">
  <p style="color:#024424;font-weight:bold;">Salebiz</p>
  <p>Hi ${name},</p>
  <p>Please verify your email by clicking the link below:</p>
  <p><a href="${verifyUrl}" style="color:#024424;">Verify my email</a></p>
  <p>This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
  <p style="color:#666;font-size:12px;">Salebiz.com.au</p>
</body>
</html>`;
}

function getPasswordResetEmailHtml(resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#333;">
  <p style="color:#024424;font-weight:bold;">Salebiz</p>
  <p>You requested a password reset. Click the link below to set a new password:</p>
  <p><a href="${resetUrl}" style="color:#024424;">Reset password</a></p>
  <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
  <p style="color:#666;font-size:12px;">Salebiz.com.au</p>
</body>
</html>`;
}
