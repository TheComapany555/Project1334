import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { signMobileToken, verifyMobileToken } from "@/lib/mobile-jwt";
import { generateSlugFromName } from "@/lib/slug";
import { Resend } from "resend";
import { verificationEmail, passwordResetEmail } from "@/lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// POST /api/mobile/auth - login
export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; email?: string; password?: string; name?: string };
    const { action = "login" } = body;

    if (action === "login") {
      return handleLogin(body as { email: string; password: string });
    }

    if (action === "register") {
      return handleRegister(body as { email: string; password: string; name: string });
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
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, photo_url")
      .eq("id", payload.sub)
      .single();

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
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
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
    return NextResponse.json({ error: "Please verify your email before signing in" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, agency_id, agency_role, name, photo_url")
    .eq("id", userRow.id)
    .single();

  const role = (profile?.role as "broker" | "admin") ?? "broker";
  let subscriptionStatus: string | null = null;

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
    },
  });
}

async function handleRegister({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) {
  if (!email || !password || !name) {
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

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

  // Create agency for this new broker
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

  // Create verification token and send email
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
