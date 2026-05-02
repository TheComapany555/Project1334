import { NextResponse } from "next/server";
import { runBuyerAlertMatching } from "@/lib/actions/buyer-alert-matching";

export const dynamic = "force-dynamic";
// Up to 5 minutes — the matching job is bounded by the lookback window but be safe.
export const maxDuration = 300;

/**
 * Cron endpoint: GitHub Actions hits this every hour with a Bearer token.
 *
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Optional query params for manual / debugging runs:
 *   ?lookbackHours=24  (default 25, max 168)
 */
async function handle(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured on the server." },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (provided !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const lookbackParam = url.searchParams.get("lookbackHours");
  let lookbackHours: number | undefined;
  if (lookbackParam != null) {
    const n = Number(lookbackParam);
    if (!Number.isFinite(n) || n <= 0 || n > 168) {
      return NextResponse.json(
        { ok: false, error: "lookbackHours must be a positive number ≤ 168 (7 days)." },
        { status: 400 },
      );
    }
    lookbackHours = Math.round(n);
  }

  try {
    const summary = await runBuyerAlertMatching({ lookbackHours });
    return NextResponse.json(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cron/buyer-alerts] failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
