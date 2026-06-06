/**
 * Standalone cron entrypoint for Feature #7 (Engagement-Based Listing Ranking).
 *
 * Recomputes listings.engagement_score from a GitHub Actions runner without
 * needing the Next.js server. Uses the same lib/jobs/listing-ranking code.
 *
 * Required env (set as GitHub Secrets, exposed via the workflow's `env:` block):
 *   NEXT_PUBLIC_SUPABASE_URL    Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY   Service-role key (RLS bypass)
 *
 * Optional:
 *   HALF_LIFE_DAYS              Days for an event's weight to halve (default 14)
 *   WINDOW_DAYS                 Ignore events older than this (default 60)
 *
 * Local run:
 *   npm run cron:listing-ranking
 *   npm run cron:listing-ranking -- --half-life 7 --window 30
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { runListingRankingRecompute } from "@/lib/jobs/listing-ranking";

// Load .env / .env.local for LOCAL runs (`npm run cron:listing-ranking`).
// In GitHub Actions these files don't exist and the env comes from secrets —
// so this is a no-op there. Mirrors scripts/seed-site-gate.ts.
function loadEnvFile(name: string) {
  const envPath = resolve(process.cwd(), name);
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}
loadEnvFile(".env");
loadEnvFile(".env.local");

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

function parseFlag(name: string, envKey: string): number | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith(`--${name}=`)) return Number(a.slice(`--${name}=`.length));
    if (a === `--${name}` && args[i + 1]) return Number(args[i + 1]);
  }
  const envVal = process.env[envKey];
  return envVal ? Number(envVal) : undefined;
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    fail(`Missing required env vars: ${missing.join(", ")}`);
  }

  const halfLifeDays = parseFlag("half-life", "HALF_LIFE_DAYS");
  const windowDays = parseFlag("window", "WINDOW_DAYS");
  for (const [label, val] of [
    ["half-life", halfLifeDays],
    ["window", windowDays],
  ] as const) {
    if (val !== undefined && (!Number.isFinite(val) || val <= 0)) {
      fail(`Invalid ${label}: ${val} (must be a positive number)`);
    }
  }

  console.log("▶ Recomputing listing engagement scores");

  const summary = await runListingRankingRecompute({ halfLifeDays, windowDays });
  console.log(JSON.stringify(summary, null, 2));

  if (!summary.ok) {
    fail(`Recompute failed: ${summary.error ?? "unknown error"}`);
  }
  console.log("✓ Run finished");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
