/**
 * Sets (or rotates) the pre-launch site-wide access password.
 * Run from project root: npm run seed:site-gate
 *
 * Loads .env and .env.local automatically. Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Password resolution order:
 *   1. CLI argument:  npm run seed:site-gate -- "MyNewPassword"
 *   2. SITE_GATE_PASSWORD env var
 *   3. DEFAULT_PASSWORD below
 *
 * The plaintext is never stored — only a bcrypt hash, in public.site_access_gate.
 * Apply migration 20260605000001_site_access_gate.sql before running this.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import * as bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(name: string) {
  const envPath = resolve(process.cwd(), name);
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      // .env.local wins over .env for overlapping keys.
      process.env[key] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}
loadEnvFile(".env");
loadEnvFile(".env.local");

const DEFAULT_PASSWORD = "SaleBiz-Preview-2026";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env).",
    );
    process.exit(1);
  }

  const password =
    process.argv[2] ?? process.env.SITE_GATE_PASSWORD ?? DEFAULT_PASSWORD;

  if (password.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const passwordHash = await bcrypt.hash(password, 12);
  const { error } = await supabase
    .from("site_access_gate")
    .upsert(
      { id: true, password_hash: passwordHash, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );

  if (error) {
    console.error("Failed to set site gate password:", error.message);
    console.error(
      "Make sure migration 20260605000001_site_access_gate.sql has been applied.",
    );
    process.exit(1);
  }

  console.log("Site gate password set.");
  console.log(`Password: ${password}`);
  console.log("Set SITE_GATE_ENABLED=true to enforce the gate.");
}

main();
