/**
 * Daily follow-ups-due notifier (M1.2).
 *
 * Runs once a day (8:00 AEST recommended) and emits an in-app
 * `follow_up_due` notification for every open follow-up where
 * `due_at::date = current_date`.
 *
 * Required env (same set as buyer-alerts-cron):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Local run:
 *   npm run cron:follow-ups-due
 *
 * Designed to be idempotent for "due today" within a single day. We don't
 * dedupe across runs — if you run twice in the same day you'll send two
 * notifications. Schedule it once per day.
 */

import { emitFollowUpDueNotifications } from "@/lib/actions/crm";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

async function main() {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      console.error(`[follow-ups-cron] missing env: ${key}`);
      process.exit(1);
    }
  }
  const startedAt = Date.now();
  try {
    const { sent } = await emitFollowUpDueNotifications();
    const ms = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        ok: true,
        sent,
        duration_ms: ms,
        ran_at: new Date().toISOString(),
      }),
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        ran_at: new Date().toISOString(),
      }),
    );
    process.exit(1);
  }
}

main();
