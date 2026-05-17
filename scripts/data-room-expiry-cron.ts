/**
 * Daily data-room access expiry sweep (M2 Phase 5).
 *
 * Marks any `buyer_data_room_access` rows past their `expires_at` as expired,
 * deletes their per-buyer permission grants, and notifies the buyer. Also
 * fires `access_expiring` notifications 3 days before expiry (deduped via
 * a 4-day lookback on existing notifications, so it sends once per buyer
 * per access record).
 *
 * Schedule: daily, any reasonable hour (recommend 7:00 AEST).
 *
 * Idempotent — safe to re-run; expired rows stay expired and the soon-to-
 * expire notification path checks for existing notifications before
 * re-sending.
 *
 * Local run:
 *   npm run cron:data-room-expiry
 */

import { expireDataRoomAccessSweep } from "@/lib/actions/data-room";

const REQUIRED_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

async function main() {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      console.error(`[data-room-expiry-cron] missing env: ${key}`);
      process.exit(1);
    }
  }
  const startedAt = Date.now();
  try {
    const { expired, expiringSoon } = await expireDataRoomAccessSweep();
    console.log(
      JSON.stringify({
        ok: true,
        expired,
        expiring_soon: expiringSoon,
        duration_ms: Date.now() - startedAt,
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
