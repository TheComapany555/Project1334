import { NextRequest, NextResponse } from "next/server";
import { getListingInsightsMetrics } from "@/lib/actions/listing-insights";
import { generateListingInsights } from "@/lib/ai/listing-insights";

export const dynamic = "force-dynamic";

type Body = { period_days?: number };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing listing id" }, { status: 400 });
  }

  let body: Body = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as Body;
  } catch {
    // Ignore body parse errors; period_days is optional.
  }

  const periodDays = typeof body.period_days === "number" ? body.period_days : undefined;

  try {
    const metrics = await getListingInsightsMetrics(id, periodDays);
    const ai = await generateListingInsights(metrics);
    return NextResponse.json({ metrics, ai });
  } catch (err) {
    return NextResponse.json(
      { error: errorMessage(err) },
      { status: errorStatus(err) },
    );
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Something went wrong while generating insights.";
}

function errorStatus(err: unknown): number {
  if (!(err instanceof Error)) return 500;
  if (/unauthor/i.test(err.message)) return 401;
  if (/forbidden/i.test(err.message)) return 403;
  if (/not found/i.test(err.message)) return 404;
  if (/not configured/i.test(err.message)) return 503;
  return 500;
}
