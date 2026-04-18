import Link from "next/link";
import type { Listing } from "@/lib/types/listings";
import { FeaturedBadge } from "@/components/listings/featured-badge";
import { isListingFeaturedAnywhere } from "@/lib/featured-dates";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

type FeaturedListingsTableProps = {
  listings: Listing[];
  showBroker?: boolean;
  type: "active" | "expired";
};

export function FeaturedListingsTable({
  listings,
  showBroker = false,
  type,
}: FeaturedListingsTableProps) {
  const filtered = listings.filter((l) =>
    type === "active"
      ? isListingFeaturedAnywhere(l)
      : !isListingFeaturedAnywhere(l) &&
          (l.featured_until != null ||
            l.featured_homepage_until != null ||
            l.featured_category_until != null ||
            l.featured_from != null)
  );

  if (filtered.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          {type === "active"
            ? "No active featured listings."
            : "No expired featured listings."}
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Listing</TableHead>
          {showBroker && <TableHead>Broker</TableHead>}
          <TableHead>Package</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Expires</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map((listing) => {
          const broker = Array.isArray(listing.broker)
            ? listing.broker[0]
            : listing.broker;
          const isActive = isListingFeaturedAnywhere(listing);
          const displayUntil =
            [
              listing.featured_homepage_until,
              listing.featured_category_until,
              listing.featured_until,
            ]
              .filter(Boolean)
              .map((d) => new Date(d as string).getTime())
              .reduce((a, b) => Math.max(a, b), 0) || null;

          return (
            <TableRow key={listing.id}>
              <TableCell>
                <Link
                  href={`/listing/${listing.slug}`}
                  className="text-sm font-medium hover:underline"
                >
                  {listing.title}
                </Link>
              </TableCell>
              {showBroker && (
                <TableCell>
                  <span className="text-sm">
                    {(broker as { name?: string | null })?.name ?? "—"}
                  </span>
                </TableCell>
              )}
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {listing.featured_package_days} days
                </Badge>
              </TableCell>
              <TableCell>
                {isActive ? (
                  <FeaturedBadge size="sm" />
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Expired
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {listing.featured_from
                    ? formatDate(listing.featured_from)
                    : "—"}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {displayUntil
                    ? formatDate(new Date(displayUntil).toISOString())
                    : "—"}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
