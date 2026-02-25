/**
 * Seeds a single admin user in Supabase for local/testing.
 * Run from project root: npm run seed:admin
 *
 * Loads .env.local automatically. Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Default admin: admin@salebiz.com.au / admin123 (change in production!)
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import * as bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

const DEFAULT_EMAIL = "admin@salebiz.com.au";
const DEFAULT_PASSWORD = "admin123";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local)."
    );
    process.exit(1);
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? DEFAULT_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_PASSWORD;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (existing) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: "admin", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (profileError) {
      console.error("Failed to set existing user as admin:", profileError.message);
      process.exit(1);
    }
    console.log("Existing user updated to admin:", email);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      email_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !newUser) {
    console.error("Failed to create user:", insertError?.message ?? "Unknown error");
    process.exit(1);
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: newUser.id,
    role: "admin",
    name: "Admin",
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    console.error("Failed to create profile:", profileError.message);
    process.exit(1);
  }

  console.log("Admin created:", email);
  console.log("Sign in at /auth/login with the email and password above.");
}

main();
