/**
 * Standalone cron entrypoint for Feature 3 (Buyer Listing Alerts).
 *
 * Runs the matching engine end-to-end from a GitHub Actions runner without
 * needing the Next.js server. Uses the same lib/jobs/buyer-alert-matching code
 * the rest of the app uses.
 *
 * Required env (set as GitHub Secrets, exposed via the workflow's `env:` block):
 *   NEXT_PUBLIC_SUPABASE_URL    Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY   Service-role key (RLS bypass)
 *   RESEND_API_KEY              For email delivery
 *   EMAIL_FROM                  Sender, e.g. "noreply@salebiz.com.au"
 *   NEXTAUTH_URL                Public app origin used in email links, e.g. "https://project1334.vercel.app"
 *
 * Optional:
 *   LOOKBACK_HOURS              Defaults to 25 (engine default). Max 168.
 *
 * Local run:
 *   npm run cron:buyer-alerts -- --lookback 2
 */

import { runBuyerAlertMatching } from "@/lib/jobs/buyer-alert-matching";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "NEXTAUTH_URL",
] as const;

function parseLookbackHours(): number | undefined {
  // CLI: --lookback 24 | --lookback=24
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--lookback=")) return Number(a.slice("--lookback=".length));
    if (a === "--lookback" && args[i + 1]) return Number(args[i + 1]);
  }
  // Env: LOOKBACK_HOURS=24
  const envVal = process.env.LOOKBACK_HOURS;
  if (envVal) return Number(envVal);
  return undefined;
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

  const lookbackHours = parseLookbackHours();
  if (lookbackHours !== undefined) {
    if (!Number.isFinite(lookbackHours) || lookbackHours <= 0 || lookbackHours > 168) {
      fail(`Invalid lookback hours: ${lookbackHours} (must be > 0 and ≤ 168)`);
    }
  }

  console.log(
    `▶ Running buyer-alerts matching${lookbackHours ? ` (lookback ${lookbackHours}h)` : " (default lookback)"}`,
  );

  let summary;
  try {
    summary = await runBuyerAlertMatching({ lookbackHours });
  } catch (err) {
    const msg = err instanceof Error ? err.stack || err.message : String(err);
    fail(`Matching engine threw: ${msg}`);
  }

  console.log("✓ Run finished");
  console.log(JSON.stringify(summary, null, 2));

  if (summary.errors.length > 0) {
    console.error(`⚠ ${summary.errors.length} non-fatal error(s) recorded.`);
    // Non-fatal errors don't break the run — the engine already swallows
    // them per-match so other matches still go out. Surface as a warning.
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
