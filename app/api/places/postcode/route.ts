import { NextRequest, NextResponse } from "next/server";
import { geoapifyLookupPostcode } from "@/lib/places/geoapify-postcode";

export const dynamic = "force-dynamic";

/**
 * Best-effort AU postcode for a suburb/city + optional state (Geoapify forward search).
 */
export async function GET(req: NextRequest) {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ postcode: null });
  }

  const suburb = (req.nextUrl.searchParams.get("suburb") ?? "").trim();
  const state = (req.nextUrl.searchParams.get("state") ?? "").trim();
  if (!suburb) {
    return NextResponse.json({ postcode: null });
  }

  try {
    const postcode = await geoapifyLookupPostcode(suburb, state, apiKey);
    return NextResponse.json({ postcode });
  } catch {
    return NextResponse.json({ postcode: null });
  }
}
