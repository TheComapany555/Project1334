"use client";

import { useMemo, useState } from "react";
import type { Category, Listing, ListingHighlight, ListingStatus } from "@/lib/types/listings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListingsTable } from "@/app/dashboard/listings/listings-table";

const STATUS_OPTIONS: { value: "" | ListingStatus; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "under_offer", label: "Under offer" },
  { value: "sold", label: "Sold" },
  { value: "unpublished", label: "Unpublished" },
];

type Props = {
  listings: (Listing & { listing_highlights?: ListingHighlight[] })[];
  categories: Category[];
  highlights: ListingHighlight[];
  brokerSlug?: string;
};

export function BrokerListingsWithFilter({
  listings,
  categories,
  highlights,
  brokerSlug,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<"" | ListingStatus>("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [highlightFilter, setHighlightFilter] = useState("");

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      if (statusFilter && listing.status !== statusFilter) return false;
      if (categoryFilter && listing.category_id !== categoryFilter) return false;
      if (highlightFilter) {
        const ids = listing.listing_highlights?.map((h) => h.id) ?? [];
        if (!ids.includes(highlightFilter)) return false;
      }
      return true;
    });
  }, [listings, statusFilter, categoryFilter, highlightFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter || "_all"}
          onValueChange={(v) => setStatusFilter((v === "_all" ? "" : v) as "" | ListingStatus)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || "_all"} value={opt.value || "_all"}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter || "_all"}
          onValueChange={(v) => setCategoryFilter(v === "_all" ? "" : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={highlightFilter || "_all"}
          onValueChange={(v) => setHighlightFilter(v === "_all" ? "" : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All tags</SelectItem>
            {highlights.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(statusFilter || categoryFilter || highlightFilter) && (
          <span className="text-sm text-muted-foreground">
            Showing {filteredListings.length} of {listings.length}
          </span>
        )}
      </div>
      <ListingsTable
        listings={filteredListings}
        brokerSlug={brokerSlug}
      />
    </div>
  );
}
