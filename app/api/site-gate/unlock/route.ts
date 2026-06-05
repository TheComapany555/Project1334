import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  SITE_GATE_COOKIE,
  SITE_GATE_MAX_AGE_SECONDS,
  isSiteGateEnabled,
  signSiteAccessToken,
} from "@/lib/site-gate";

// POST /api/site-gate/unlock — verify the shared pre-launch password and, on
// success, set the signed access cookie so the visitor passes the site gate.
export async function POST(request: Request) {
  try {
    if (!isSiteGateEnabled()) {
      return NextResponse.json({ ok: true });
    }

    const body = await request.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password : "";

    if (!password) {
      return NextResponse.json(
        { ok: false, error: "Please enter the password." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();
    const { data: gate } = await supabase
      .from("site_access_gate")
      .select("password_hash")
      .eq("id", true)
      .single();

    if (!gate?.password_hash) {
      // No password configured yet — fail closed so the site stays protected.
      console.error("[site-gate] no password configured in site_access_gate");
      return NextResponse.json(
        { ok: false, error: "The site is not accepting access right now." },
        { status: 503 },
      );
    }

    const matches = await bcrypt.compare(password, gate.password_hash);
    if (!matches) {
      return NextResponse.json(
        { ok: false, error: "Incorrect password. Please try again." },
        { status: 401 },
      );
    }

    const token = await signSiteAccessToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SITE_GATE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SITE_GATE_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err) {
    console.error("[site-gate] unlock error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
