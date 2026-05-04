/**
 * Resolve a representative Australian postcode when autocomplete returns a city/suburb
 * without `postcode` (common for `result_type: city`).
 * Uses Geoapify forward geocode search.
 */

type GeoRow = {
  postcode?: string;
  country_code?: string;
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
  if (!res.ok) return null;

  const json: unknown = await res.json();
  for (const row of rowsFromGeocodeJson(json)) {
    if (row.country_code && row.country_code.toLowerCase() !== "au") continue;
    const pc = row.postcode?.toString().trim();
    if (pc) return pc;
  }
  return null;
}
