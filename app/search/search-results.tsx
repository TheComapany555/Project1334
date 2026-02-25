import Link from "next/link";
import Image from "next/image";
import type { Listing } from "@/lib/types/listings";

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

type Props = {
  listings: Listing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currentParams: Record<string, string>;
};

function buildQueryString(params: Record<string, string>, overrides: Record<string, string>): string {
  const p = new URLSearchParams();
  Object.entries({ ...params, ...overrides }).forEach(([k, v]) => {
    if (v != null && v !== "") p.set(k, v);
  });
  return p.toString();
}

export function SearchResults({ listings, total, page, pageSize, totalPages, currentParams }: Props) {
  const qs = (overrides: Record<string, string>) => {
    const s = buildQueryString(currentParams, overrides);
    return s ? `?${s}` : "";
  };

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  if (listings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-12 text-center">
        <p className="font-medium text-foreground">No listings found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters or search keyword.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end} of {total} listing{total !== 1 ? "s" : ""}
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => {
          const thumb = listing.listing_images?.[0]?.url;
          const location = [listing.suburb, listing.state].filter(Boolean).join(", ");
          return (
            <li key={listing.id}>
              <Link
                href={`/listing/${listing.slug}`}
                className="block rounded-lg border border-border bg-card overflow-hidden transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-medium line-clamp-2">{listing.title}</p>
                  {listing.category && (
                    <p className="text-sm text-muted-foreground mt-0.5">{listing.category.name}</p>
                  )}
                  {location && (
                    <p className="text-sm text-muted-foreground">{location}</p>
                  )}
                  <p className="text-sm font-medium mt-2">{formatPrice(listing)}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-2 pt-4" aria-label="Pagination">
          <Link
            href={`/search${qs({ page: String(page - 1) })}`}
            className={`inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              page <= 1
                ? "pointer-events-none border-border bg-muted text-muted-foreground"
                : "border-border bg-background hover:bg-muted"
            }`}
          >
            Previous
          </Link>
          <span className="px-2 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/search${qs({ page: String(page + 1) })}`}
            className={`inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              page >= totalPages
                ? "pointer-events-none border-border bg-muted text-muted-foreground"
                : "border-border bg-background hover:bg-muted"
            }`}
          >
            Next
          </Link>
        </nav>
      )}
    </div>
  );
}
