/**
 * Resolve a representative Australian postcode when autocomplete returns a city/suburb
 * without `postcode` (common for `result_type: city`).
 *
 * Strategy:
 *  1. Forward-geocode the suburb/city. If a result already carries a postcode
 *     (typical for specific suburbs like "Bondi"), return it.
 *  2. Otherwise take the top result's coordinates and reverse-geocode them —
 *     the building/address-level result reliably carries a postcode (needed
 *     for city-level inputs like "Sydney" or "Melbourne" where the centroid
 *     itself has no postcode).
 */

type GeoRow = {
  postcode?: string;
  country_code?: string;
  result_type?: string;
  lat?: number;
  lon?: number;
};

function rowsFromGeocodeJson(json: unknown): GeoRow[] {
  if (!json || typeof json !== "object") return [];
  const o = json as Record<string, unknown>;
  if (Array.isArray(o.results)) {
    return o.results.filter((r): r is GeoRow => r != null && typeof r === "object");
  }
  if (Array.isArray(o.features)) {
    return o.features
      .map((f) => {
        if (!f || typeof f !== "object") return null;
        return (f as { properties?: GeoRow }).properties ?? null;
      })
      .filter((r): r is GeoRow => r != null);
  }
  return [];
}

function isAu(row: GeoRow): boolean {
  return !row.country_code || row.country_code.toLowerCase() === "au";
}

async function forwardSearch(text: string, apiKey: string): Promise<GeoRow[]> {
  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.searchParams.set("text", text);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("filter", "countrycode:au");
  url.searchParams.set("lang", "en");
  url.searchParams.set("limit", "5");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  return rowsFromGeocodeJson(await res.json());
}

async function reverseGeocodePostcode(
  lat: number,
  lon: number,
  apiKey: string,
): Promise<string | null> {
  const url = new URL("https://api.geoapify.com/v1/geocode/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("filter", "countrycode:au");
  url.searchParams.set("lang", "en");
  url.searchParams.set("limit", "1");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;

  for (const row of rowsFromGeocodeJson(await res.json())) {
    if (!isAu(row)) continue;
    const pc = row.postcode?.toString().trim();
    if (pc) return pc;
  }
  return null;
}

/**
 * Returns a single postcode string when Geoapify can infer one, otherwise null.
 */
export async function geoapifyLookupPostcode(
  suburb: string,
  state: string,
  apiKey: string,
): Promise<string | null> {
  const s = suburb.trim();
  if (!s) return null;

  const text = [s, state.trim(), "Australia"].filter(Boolean).join(" ").slice(0, 120);

  const rows = await forwardSearch(text, apiKey).catch(() => [] as GeoRow[]);

  for (const row of rows) {
    if (!isAu(row)) continue;
    const pc = row.postcode?.toString().trim();
    if (pc) return pc;
  }

  for (const row of rows) {
    if (!isAu(row)) continue;
    if (typeof row.lat === "number" && typeof row.lon === "number") {
      const pc = await reverseGeocodePostcode(row.lat, row.lon, apiKey).catch(() => null);
      if (pc) return pc;
    }
  }
  return null;
}
