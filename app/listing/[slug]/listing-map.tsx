"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";

const NOMINATIM_USER_AGENT = "Salebiz Listing Map (https://salebiz.com.au)";

type ListingMapProps = {
  location: string;
};

/** Geocode using OpenStreetMap Nominatim (no API key). */
async function geocodeWithNominatim(
  query: string,
): Promise<{ lat: number; lon: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${query}, Australia`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": NOMINATIM_USER_AGENT },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = Number(data[0].lat);
  const lon = Number(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

/** OpenStreetMap embed URL for a point (bbox around lat/lon). No API key required. */
function osmEmbedUrl(lat: number, lon: number, delta = 0.015): string {
  const minLon = lon - delta;
  const minLat = lat - delta;
  const maxLon = lon + delta;
  const maxLat = lat + delta;
  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
  const marker = `${lat},${lon}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${encodeURIComponent(marker)}`;
}

export function ListingMap({ location }: ListingMapProps) {
  const [showMap, setShowMap] = useState(true);
  const [osmState, setOsmState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [osmEmbedUrlState, setOsmEmbedUrlState] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const query = encodeURIComponent(location + ", Australia");
  const useGoogle = Boolean(apiKey);

  // No Google key: load OpenStreetMap automatically on mount
  useEffect(() => {
    if (useGoogle) return;
    let cancelled = false;
    (async () => {
      const result = await geocodeWithNominatim(location);
      if (cancelled) return;
      if (result) {
        setOsmEmbedUrlState(osmEmbedUrl(result.lat, result.lon));
        setOsmState("ready");
      } else {
        setOsmState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useGoogle, location]);

  const osmLink = `https://www.openstreetmap.org/search?query=${encodeURIComponent(location + ", Australia")}`;

  // No Google key: show OSM map (loading → ready or error)
  if (!useGoogle) {
    if (osmState === "loading") {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading map…</p>
          </CardContent>
        </Card>
      );
    }

    if (osmState === "error" || !osmEmbedUrlState) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-6">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{location}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Could not load map. Open the location in OpenStreetMap.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <a href={osmLink} target="_blank" rel="noopener noreferrer">
                <MapPin className="h-3.5 w-3.5" />
                Open in OpenStreetMap
              </a>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative aspect-[16/9] w-full bg-muted">
            <iframe
              title="Listing location (OpenStreetMap)"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts"
              src={osmEmbedUrlState}
              className="absolute inset-0"
            />
          </div>
          <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Approximate location — {location}
            </p>
            <a
              href={osmLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              View on OpenStreetMap
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Google Maps path (API key present)
  if (!showMap) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-6">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{location}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              View the approximate location on a map
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMap(true)}
            className="gap-1.5"
          >
            <MapPin className="h-3.5 w-3.5" />
            Show map
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4" />
          Location
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-[16/9] w-full bg-muted">
          <iframe
            title="Listing location"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}&zoom=13`}
            allowFullScreen
            className="absolute inset-0"
          />
        </div>
        <div className="px-4 py-2.5 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Approximate location — {location}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
