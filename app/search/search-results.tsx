import Link from "next/link";
import Image from "next/image";
import type { Listing } from "@/lib/types/listings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Building2, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(listing: Listing): string {
  if (listing.price_type === "poa") return "POA";
  if (listing.asking_price != null) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(Number(listing.asking_price));
  }
  return "—";
}

function buildQueryString(
  params: Record<string, string>,
  overrides: Record<string, string>
): string {
  const p = new URLSearchParams();
  Object.entries({ ...params, ...overrides }).forEach(([k, v]) => {
    if (v != null && v !== "") p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  listings: Listing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currentParams: Record<string, string>;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SearchResults({
  listings,
  total,
  page,
  pageSize,
  totalPages,
  currentParams,
}: Props) {
  const qs = (overrides: Record<string, string>) =>
    buildQueryString(currentParams, overrides);

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // ── Empty state ──
  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/20 px-6 py-20 text-center">
        <div className="rounded-full bg-muted p-4">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1 max-w-xs">
          <p className="font-medium">No listings found</p>
          <p className="text-sm text-muted-foreground">
            Try broadening your search or removing some filters.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/search">Clear all filters</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Result count ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span>{" "}
          listing{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Grid ── */}
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => {
          const thumb = listing.listing_images?.[0]?.url;
          const location = [listing.suburb, listing.state]
            .filter(Boolean)
            .join(", ");
          const price = formatPrice(listing);
          const isPOA = price === "POA";

          return (
            <li key={listing.id}>
              <Link
                href={`/listing/${listing.slug}`}
                className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* Thumbnail */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Building2 className="h-10 w-10 text-muted-foreground/25" />
                    </div>
                  )}

                  {/* Category pill overlaid on image */}
                  {listing.category && (
                    <div className="absolute bottom-2 left-2">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-background/90 backdrop-blur-sm border border-border/50"
                      >
                        {listing.category.name}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-4 gap-3">
                  <div className="space-y-1">
                    <p className="font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {listing.title}
                    </p>
                    {location && (
                      <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {location}
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between mt-auto">
                    <span
                      className={`text-sm font-semibold ${
                        isPOA ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {price}
                    </span>
                    <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      View listing →
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-3 pt-4"
          aria-label="Pagination"
        >
          <Button
            asChild={page > 1}
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={page <= 1}
          >
            {page > 1 ? (
              <Link href={`/search${qs({ page: String(page - 1) })}`}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Link>
            ) : (
              <span>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </span>
            )}
          </Button>

          <span className="text-sm text-muted-foreground tabular-nums">
            Page {page} of {totalPages}
          </span>

          <Button
            asChild={page < totalPages}
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={page >= totalPages}
          >
            {page < totalPages ? (
              <Link href={`/search${qs({ page: String(page + 1) })}`}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span>
                Next
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </nav>
      )}
    </div>
  );
}