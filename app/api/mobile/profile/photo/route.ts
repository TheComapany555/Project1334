import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getMobileUser } from "@/lib/mobile-jwt";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

function mimeFromFileName(name: string): string | null {
  const n = name.toLowerCase();
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  return null;
}

function resolveImageType(file: File): string | null {
  if (file.type && ALLOWED_TYPES.includes(file.type)) return file.type;
  const fromName = mimeFromFileName(file.name || "");
  return fromName;
}

// POST /api/mobile/profile/photo — multipart field "file" (buyer accounts only)
export async function POST(request: Request) {
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

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Invalid file upload" }, { status: 400 });
    }

    const webFile = file as File;
    if (webFile.size > MAX_SIZE) {
      return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
    }

    const mime = resolveImageType(webFile);
    if (!mime) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP and GIF are allowed" },
        { status: 400 },
      );
    }

    const extFromMime: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const ext = extFromMime[mime] || "jpg";
    const path = `${mobileUser.sub}/avatar.${ext}`;

    const buffer = Buffer.from(await webFile.arrayBuffer());

    // Delete old avatar files to prevent orphans and CDN cache issues
    const { data: oldFiles } = await supabase.storage.from("avatars").list(mobileUser.sub);
    if (oldFiles?.length) {
      await supabase.storage.from("avatars").remove(oldFiles.map((f) => `${mobileUser.sub}/${f.name}`));
    }

    // Use timestamp in filename to bust CDN cache
    const uniquePath = `${mobileUser.sub}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(uniquePath, buffer, {
      contentType: mime,
    });
    if (uploadError) {
      console.error("[mobile/profile/photo] storage:", uploadError);
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(uniquePath);
    const url = urlData.publicUrl;

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update({ photo_url: url, updated_at: new Date().toISOString() })
      .eq("id", mobileUser.sub)
      .eq("role", "user")
      .select("name, photo_url, phone, created_at")
      .single();

    if (updateError) {
      console.error("[mobile/profile/photo] profile update:", updateError);
      return NextResponse.json({ error: "Failed to save photo" }, { status: 500 });
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("email_verified_at")
      .eq("id", mobileUser.sub)
      .maybeSingle();

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
        phone: updated?.phone ?? null,
        emailVerifiedAt: userRow?.email_verified_at ?? null,
        createdAt: updated?.created_at ?? null,
      },
    });
  } catch (err) {
    console.error("[mobile/profile/photo] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
