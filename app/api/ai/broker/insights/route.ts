import { NextRequest, NextResponse } from "next/server";
import { getBrokerAnalytics } from "@/lib/actions/analytics";
import { generateBrokerAccountInsights } from "@/lib/ai/broker-insights";

export const dynamic = "force-dynamic";

const ALLOWED_PERIODS = [7, 30, 90] as const;

type Body = { period_days?: number };

export async function POST(req: NextRequest) {
  let body: Body = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as Body;
  } catch {
    // optional body
  }

  const raw =
    typeof body.period_days === "number" ? body.period_days : 30;
  const periodDays = (ALLOWED_PERIODS as readonly number[]).includes(raw)
    ? raw
    : 30;

  try {
    const overview = await getBrokerAnalytics(periodDays);
    const ai = await generateBrokerAccountInsights(overview);
    return NextResponse.json({ ai });
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
