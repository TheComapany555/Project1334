/**
 * Delete ALL listings (the seeded/fake test data) so the platform starts clean
 * before real REAXML imports. DESTRUCTIVE and IRREVERSIBLE.
 *
 * Safe by default: a plain run is a DRY RUN — it only counts and reports.
 * To actually delete, pass --confirm:
 *
 *   npm run delete:fake-listings              # dry run (counts only)
 *   npm run delete:fake-listings -- --confirm # actually deletes
 *
 * Deleting a listing cascades to listing_images, listing_highlight_map,
 * listing_vendor_details and listing_external_refs (FK ON DELETE CASCADE).
 * NOTE: image files already uploaded to Supabase Storage are NOT removed by
 * this script (they become unreferenced); clear the `listing-images` bucket
 * separately if you want them gone too.
 *
 * Loads .env.local then .env. Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(file: string) {
  const envPath = resolve(process.cwd(), file);
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      if (!(key in process.env)) {
        process.env[key] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

async function main() {
  const confirm = process.argv.includes("--confirm");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (set in .env).");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count, error: countErr } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true });
  if (countErr) {
    console.error("Failed to count listings:", countErr.message);
    process.exit(1);
  }

  const total = count ?? 0;
  console.log(`Found ${total} listing(s).`);

  if (total === 0) {
    console.log("Nothing to delete.");
    return;
  }

  if (!confirm) {
    console.log(
      `\nDRY RUN — nothing deleted.\nRe-run with --confirm to permanently delete all ${total} listing(s):\n  npm run delete:fake-listings -- --confirm`,
    );
    return;
  }

  console.log(`\n⚠️  Deleting all ${total} listing(s)…`);
  const { data, error } = await supabase
    .from("listings")
    .delete()
    .not("id", "is", null)
    .select("id");
  if (error) {
    console.error("Delete failed:", error.message);
    process.exit(1);
  }
  console.log(`✅ Deleted ${data?.length ?? 0} listing(s). Related rows cascaded.`);
  console.log("Reminder: image files in the listing-images bucket are not removed by this script.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
