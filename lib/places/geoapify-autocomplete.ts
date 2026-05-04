/**
 * Geoapify Address Autocomplete (Australia filter).
 * @see https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/
 *
 * Autocomplete responses are GeoJSON FeatureCollections (`features[].properties`),
 * not the same `{ results: [] }` shape as forward geocode `format=json`.
 */

export type AuPlaceSuggestion = {
  id: string;
  /** Full line for the dropdown */
  label: string;
  secondary?: string;
  suburb: string;
  state: string;
  postcode: string;
};

type GeoapifyProps = {
  place_id?: string;
  formatted?: string;
  name?: string;
  suburb?: string;
  city?: string;
  district?: string;
  state_code?: string;
  postcode?: string;
  result_type?: string;
  country_code?: string;
};

function rowToSuggestion(row: GeoapifyProps, index: number): AuPlaceSuggestion | null {
  if (row.country_code && row.country_code.toLowerCase() !== "au") {
    return null;
  }

  const suburb =
    row.suburb?.trim() ||
    row.city?.trim() ||
    row.district?.trim() ||
    row.name?.trim() ||
    "";
  if (!suburb && !row.postcode) return null;

  const state = (row.state_code ?? "").trim();
  const postcode = (row.postcode ?? "").trim();
  const label = (row.formatted ?? [suburb, state, postcode].filter(Boolean).join(" ")).trim();
  const id = row.place_id ?? `${label}-${index}`;

  const secondary = [state, postcode].filter(Boolean).join(" ").trim();

  return {
    id,
    label,
    secondary: secondary || undefined,
    suburb: suburb || postcode,
    state,
    postcode,
  };
}

function normalizeRows(json: unknown): GeoapifyProps[] {
  if (!json || typeof json !== "object") return [];
  const o = json as Record<string, unknown>;

  // Default autocomplete: GeoJSON FeatureCollection
  const features = o.features;
  if (Array.isArray(features)) {
    return features
      .map((f) => {
        if (!f || typeof f !== "object") return null;
        const props = (f as { properties?: GeoapifyProps }).properties;
        return props ?? null;
      })
      .filter((p): p is GeoapifyProps => p != null);
  }

  // Some endpoints return flat `results` (forward geocode style)
  const results = o.results;
  if (Array.isArray(results)) {
    return results.filter((r): r is GeoapifyProps => r != null && typeof r === "object");
  }

  return [];
}

export async function geoapifyAutocomplete(
  text: string,
  apiKey: string,
): Promise<AuPlaceSuggestion[]> {
  const q = text.trim().slice(0, 80);
  if (!q) return [];

  const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  url.searchParams.set("text", q);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("filter", "countrycode:au");
  url.searchParams.set("lang", "en");
  url.searchParams.set("limit", "8");
  // Omit `format` so we get FeatureCollection (matches Geoapify playground / default).

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Geoapify error ${res.status}`);
  }

  const json: unknown = await res.json();
  const rows = normalizeRows(json);
  const out: AuPlaceSuggestion[] = [];
  rows.forEach((row, i) => {
    const s = rowToSuggestion(row, i);
    if (s) out.push(s);
  });
  return out;
}
