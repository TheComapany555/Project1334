import { NextRequest, NextResponse } from "next/server";
import { geoapifyAutocomplete } from "@/lib/places/geoapify-autocomplete";

export const dynamic = "force-dynamic";

/**
 * Australian suburb / city autocomplete (Geoapify, server-side key).
 * `GET` with no `q` (or empty `q`) returns `{ configured, results: [] }` so the client can detect setup.
 */
export async function GET(req: NextRequest) {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  const raw = req.nextUrl.searchParams.get("q");

  if (raw === null || raw.trim() === "") {
    return NextResponse.json({
      configured: Boolean(apiKey),
      results: [] as unknown[],
    });
  }

  const q = raw.trim();
  if (q.length < 2) {
    return NextResponse.json({
      configured: Boolean(apiKey),
      results: [] as unknown[],
    });
  }
  if (q.length > 80) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ configured: false, results: [] });
  }

  try {
    const results = await geoapifyAutocomplete(q, apiKey);
    return NextResponse.json({ configured: true, results });
  } catch {
    return NextResponse.json({
      configured: true,
      results: [],
      error: "Suggestions unavailable",
    });
  }
}
