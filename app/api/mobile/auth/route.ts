import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { signMobileToken, verifyMobileToken } from "@/lib/mobile-jwt";
import { generateSlugFromName } from "@/lib/slug";
import { Resend } from "resend";
import {
  verificationEmail,
  passwordResetEmail,
  mobileUserOtpEmail,
} from "@/lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// POST /api/mobile/auth - login
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      action?: string;
      email?: string;
      password?: string;
      name?: string;
      role?: string;
      code?: string;
    };
    const { action = "login" } = body;

    if (action === "login") {
      return handleLogin(body as { email: string; password: string });
    }

    if (action === "register") {
      return handleRegister(body as { email: string; password: string; name: string; role?: string });
    }

    if (action === "verify-email-otp") {
      return handleVerifyEmailOtp(body as { email: string; code: string });
    }

    if (action === "resend-email-otp") {
      return handleResendEmailOtp(body as { email: string });
    }

    if (action === "reset-password") {
      return handleResetPassword(body as { email: string });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[mobile/auth] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/mobile/auth - get current user from token
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const payload = await verifyMobileToken(token);

    const supabase = createServiceRoleClient();
    const [{ data: profile }, { data: userRow }] = await Promise.all([
      supabase
        .from("profiles")
        .select("name, photo_url, phone, created_at")
        .eq("id", payload.sub)
        .single(),
      supabase
        .from("users")
        .select("email_verified_at, created_at")
        .eq("id", payload.sub)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      user: {
        id: payload.sub,
        email: payload.email,
        name: profile?.name ?? null,
        role: payload.role,
        agencyId: payload.agencyId,
        agencyRole: payload.agencyRole,
        subscriptionStatus: payload.subscriptionStatus,
        photoUrl: profile?.photo_url ?? null,
        phone: profile?.phone ?? null,
        emailVerifiedAt: userRow?.email_verified_at ?? null,
        createdAt: profile?.created_at ?? userRow?.created_at ?? null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}

type LoginNotice = {
  variant: string;
  title: string;
  message: string;
};

/** Context for the mobile app after sign-in (broker vs buyer, email overlap with agency/broker contacts). */
async function buildLoginNotice(
  supabase: ReturnType<typeof createServiceRoleClient>,
  normalizedEmail: string,
  role: "broker" | "admin" | "user",
): Promise<LoginNotice> {
  if (role === "broker" || role === "admin") {
    return {
      variant: "broker_account",
      title: "Signed in as broker",
      message:
        "This login is a broker or agency account — not a regular shopper (user) account. Manage listings and your dashboard on salebiz.com.au. You can still browse listings in this app.",
    };
  }

  const [{ data: agencyMatch }, { data: brokerPublicMatch }] = await Promise.all([
    supabase
      .from("agencies")
      .select("id")
      .not("email", "is", null)
      .ilike("email", normalizedEmail)
      .limit(1),
    supabase
      .from("profiles")
      .select("id")
      .eq("role", "broker")
      .not("email_public", "is", null)
      .ilike("email_public", normalizedEmail)
      .limit(1),
  ]);

  const emailUsedAsBrokerOrAgencyContact =
    (agencyMatch?.length ?? 0) > 0 || (brokerPublicMatch?.length ?? 0) > 0;

  if (emailUsedAsBrokerOrAgencyContact) {
    return {
      variant: "buyer_email_matches_broker_contact",
      title: "Signed in as a user",
      message:
        "This email is also used as a broker or agency contact on Salebiz. Here you are signed in as a regular user (shopper), not as a broker. To use broker tools, sign in through salebiz.com.au with your broker account.",
    };
  }

  return {
    variant: "buyer_account",
    title: "Signed in as a user",
    message:
      "You are signed in as a regular user — browse listings, save favourites, and send enquiries. Broker and agency accounts are set up on salebiz.com.au.",
  };
}

function generateSixDigitOtp(): string {
  return randomInt(100000, 1_000_000).toString();
}

type SupabaseAdmin = ReturnType<typeof createServiceRoleClient>;

async function issueMobileUserOtp(
  supabase: SupabaseAdmin,
  userId: string,
  email: string,
  displayName: string,
): Promise<void> {
  await supabase.from("auth_tokens").delete().eq("user_id", userId).eq("type", "mobile_email_otp");

  const otp = generateSixDigitOtp();
  const tokenHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const { error } = await supabase.from("auth_tokens").insert({
    user_id: userId,
    type: "mobile_email_otp",
    token: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error("[mobile/auth] issueMobileUserOtp insert:", error);
    return;
  }

  await resend.emails
    .send({
      from: EMAIL_FROM,
      to: email,
      subject: "Your Salebiz verification code",
      html: mobileUserOtpEmail(otp, displayName || "there"),
    })
    .catch((e) => {
      console.error("[mobile/auth] OTP email send:", e);
    });
}

async function handleVerifyEmailOtp({ email, code }: { email: string; code: string }) {
  const normalized = email.toLowerCase().trim();
  const digits = String(code ?? "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(digits)) {
    return NextResponse.json(
      { error: "Enter the 6-digit code from your email" },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("id, email_verified_at")
    .eq("email", normalized)
    .single();

  if (!userRow) {
    return NextResponse.json({ error: "Invalid code or email" }, { status: 400 });
  }

  if (userRow.email_verified_at) {
    return NextResponse.json({
      success: true,
      message: "Email already verified. You can sign in.",
    });
  }

  const { data: rows } = await supabase
    .from("auth_tokens")
    .select("id, token, expires_at")
    .eq("user_id", userRow.id)
    .eq("type", "mobile_email_otp")
    .order("created_at", { ascending: false })
    .limit(1);

  const row = rows?.[0];
  if (!row || new Date(row.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Code expired or invalid. Tap Resend code for a new one." },
      { status: 400 },
    );
  }

  const match = await bcrypt.compare(digits, row.token);
  if (!match) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userRow.id)
    .maybeSingle();

  if (profileErr) {
    console.error("[mobile/auth] verify-email-otp profile:", profileErr);
    return NextResponse.json({ error: "Could not load your account. Try again." }, { status: 500 });
  }

  if (!profile) {
    const displayName =
      normalized
        .split("@")[0]
        ?.replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase()) || "User";
    const { error: createProfileErr } = await supabase.from("profiles").insert({
      id: userRow.id,
      name: displayName,
      role: "user",
      status: "active",
      updated_at: new Date().toISOString(),
    });
    if (createProfileErr) {
      console.error("[mobile/auth] verify-email-otp create profile:", createProfileErr);
      return NextResponse.json(
        {
          error:
            "Could not finish setup. Ask your admin to run the latest database migration (profiles role must allow \"user\"), then try again.",
        },
        { status: 500 },
      );
    }
  } else if (profile.role !== "user") {
    return NextResponse.json(
      { error: "This account must be verified using the link sent to your email." },
      { status: 400 },
    );
  }

  await supabase
    .from("users")
    .update({ email_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", userRow.id);

  await supabase.from("auth_tokens").delete().eq("id", row.id);

  return NextResponse.json({
    success: true,
    message: "Email verified. You can sign in.",
  });
}

async function handleResendEmailOtp({ email }: { email: string }) {
  const normalized = email.toLowerCase().trim();
  if (!normalized) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("id, email, email_verified_at")
    .eq("email", normalized)
    .single();

  if (!userRow || userRow.email_verified_at) {
    return NextResponse.json({ success: true });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", userRow.id)
    .single();

  if (profile?.role !== "user") {
    return NextResponse.json({ success: true });
  }

  await issueMobileUserOtp(supabase, userRow.id, userRow.email, profile?.name ?? "there");

  return NextResponse.json({ success: true });
}

async function handleLogin({ email, password }: { email: string; password: string }) {
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("id, email, password_hash, email_verified_at")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!userRow) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, userRow.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (!userRow.email_verified_at) {
    // Re-issue an OTP for buyer accounts so the app can resume the verify-email flow.
    const { data: pendingProfile } = await supabase
      .from("profiles")
      .select("role, name")
      .eq("id", userRow.id)
      .maybeSingle();

    if (pendingProfile?.role === "user") {
      await issueMobileUserOtp(
        supabase,
        userRow.id,
        userRow.email,
        pendingProfile?.name ?? "there",
      );
    }

    return NextResponse.json(
      {
        error: "Please verify your email before signing in",
        code: "email_not_verified",
        email: userRow.email,
      },
      { status: 401 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, agency_id, agency_role, name, photo_url, phone, created_at")
    .eq("id", userRow.id)
    .single();

  const role = (profile?.role as "broker" | "admin" | "user") ?? "user";
  let subscriptionStatus: string | null = null;

  // Agency/subscription checks only apply to brokers, not users
  if (role === "broker" && profile?.agency_id) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("status")
      .eq("id", profile.agency_id)
      .single();

    if (!agency || agency.status !== "active") {
      return NextResponse.json({ error: "Your agency account is not active" }, { status: 403 });
    }

    const { data: sub } = await supabase
      .from("agency_subscriptions")
      .select("status, grace_period_end")
      .eq("agency_id", profile.agency_id)
      .in("status", ["active", "trialing", "past_due", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (sub) {
      subscriptionStatus = sub.status;
      if (
        sub.status === "past_due" &&
        sub.grace_period_end &&
        new Date(sub.grace_period_end) < new Date()
      ) {
        subscriptionStatus = "expired";
      }
    }
  }

  const token = await signMobileToken({
    sub: userRow.id,
    email: userRow.email,
    role,
    agencyId: profile?.agency_id ?? null,
    agencyRole: profile?.agency_role ?? null,
    subscriptionStatus,
  });

  const loginNotice = await buildLoginNotice(supabase, userRow.email, role);

  return NextResponse.json({
    token,
    user: {
      id: userRow.id,
      email: userRow.email,
      name: profile?.name ?? null,
      role,
      agencyId: profile?.agency_id ?? null,
      agencyRole: profile?.agency_role ?? null,
      subscriptionStatus,
      photoUrl: profile?.photo_url ?? null,
      phone: profile?.phone ?? null,
      emailVerifiedAt: userRow.email_verified_at ?? null,
      createdAt: profile?.created_at ?? null,
    },
    loginNotice,
  });
}

async function handleRegister({
  email,
  password,
  name,
  role: requestedRole,
}: {
  email: string;
  password: string;
  name: string;
  role?: string;
}) {
  if (!email || !password || !name) {
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // Mobile app registers as "user" role; web registers as "broker"
  const isUserRole = requestedRole === "user";

  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const { data: newUser, error: createError } = await supabase
    .from("users")
    .insert({
      email: email.toLowerCase().trim(),
      password_hash,
    })
    .select("id, email")
    .single();

  if (createError || !newUser) {
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }

  if (isUserRole) {
    // Simple "user" role — mobile app verifies email with OTP (no link email)
    const { error: profileError } = await supabase.from("profiles").insert({
      id: newUser.id,
      name: name.trim(),
      role: "user",
      status: "active",
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("[mobile/auth] register user profile:", profileError);
      await supabase.from("users").delete().eq("id", newUser.id);
      return NextResponse.json(
        {
          error:
            "Could not create your profile. If this persists, ensure the database allows role \"user\" on profiles (run latest migrations).",
        },
        { status: 500 },
      );
    }

    await issueMobileUserOtp(supabase, newUser.id, newUser.email, name.trim());

    return NextResponse.json(
      {
        verificationRequired: true,
        message:
          "We sent a 6-digit code to your email. Enter it in the app to verify your account (code expires in 15 minutes).",
      },
      { status: 201 },
    );
  } else {
    // Broker registration — create agency + broker profile
    const agencySlug = generateSlugFromName(name || "agency");
    const { data: agency } = await supabase
      .from("agencies")
      .insert({
        name: name.trim() || "My Agency",
        slug: agencySlug,
        status: "active",
      })
      .select("id")
      .single();

    const profileSlug = name ? generateSlugFromName(name) : null;
    await supabase.from("profiles").insert({
      id: newUser.id,
      name: name.trim(),
      role: "broker",
      status: "active",
      slug: profileSlug,
      agency_id: agency?.id ?? null,
      agency_role: agency ? "owner" : null,
      updated_at: new Date().toISOString(),
    });
  }

  // Broker (non-mobile) path: link-based verification
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
    to: email.toLowerCase().trim(),
    subject: "Verify your Salebiz account",
    html: verificationEmail(verifyUrl, name || "there"),
  }).catch(() => {});

  return NextResponse.json({
    message: "Account created. Please check your email to verify your account before signing in.",
  }, { status: 201 });
}

async function handleResetPassword({ email }: { email: string }) {
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Fire and forget — don't reveal whether email exists
  const supabase = createServiceRoleClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (user) {
    // Delete old reset tokens
    await supabase.from("auth_tokens").delete().eq("user_id", user.id).eq("type", "password_reset");

    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await supabase.from("auth_tokens").insert({
      user_id: user.id,
      type: "password_reset",
      token,
      expires_at: expiresAt.toISOString(),
    });

    const resetUrl = `${APP_URL}/auth/reset?token=${token}`;
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email.toLowerCase().trim(),
      subject: "Reset your Salebiz password",
      html: passwordResetEmail(resetUrl),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
