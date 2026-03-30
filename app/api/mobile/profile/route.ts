import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getMobileUser } from "@/lib/mobile-jwt";

// PATCH /api/mobile/profile — buyer (role user) updates own display name / photo URL
export async function PATCH(request: Request) {
  try {
    const mobileUser = await getMobileUser(request);
    if (!mobileUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const { data: profile, error: fetchErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", mobileUser.sub)
      .single();

    if (fetchErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    if (profile.role !== "user") {
      return NextResponse.json(
        { error: "Only buyer accounts can update their profile in the app" },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      photoUrl?: string | null;
    };

    const updates: Record<string, string | null> = {};

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 2 || name.length > 120) {
        return NextResponse.json({ error: "Name must be 2–120 characters" }, { status: 400 });
      }
      updates.name = name;
    }

    if (body.photoUrl !== undefined) {
      const p = body.photoUrl;
      if (p === null || p === "") {
        updates.photo_url = null;
      } else if (typeof p === "string") {
        const trimmed = p.trim();
        if (trimmed.length > 2048) {
          return NextResponse.json({ error: "Photo URL too long" }, { status: 400 });
        }
        try {
          const u = new URL(trimmed);
          if (u.protocol !== "http:" && u.protocol !== "https:") {
            return NextResponse.json({ error: "Photo URL must be http or https" }, { status: 400 });
          }
          updates.photo_url = trimmed;
        } catch {
          return NextResponse.json({ error: "Invalid photo URL" }, { status: 400 });
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", mobileUser.sub)
      .eq("role", "user")
      .select("name, photo_url")
      .single();

    if (error) {
      console.error("[mobile/profile] update error:", error);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        id: mobileUser.sub,
        email: mobileUser.email,
        name: updated?.name ?? null,
        role: mobileUser.role,
        agencyId: mobileUser.agencyId,
        agencyRole: mobileUser.agencyRole,
        subscriptionStatus: mobileUser.subscriptionStatus,
        photoUrl: updated?.photo_url ?? null,
      },
    });
  } catch (err) {
    console.error("[mobile/profile] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
