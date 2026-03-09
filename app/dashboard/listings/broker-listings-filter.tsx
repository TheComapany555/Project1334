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
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
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
  isAgencyOwner?: boolean;
  canFeature?: boolean;
};

export function BrokerListingsWithFilter({
  listings,
  categories,
  highlights,
  brokerSlug,
  isAgencyOwner,
  canFeature,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<"" | ListingStatus>("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [highlightFilter, setHighlightFilter] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [highlightQuery, setHighlightQuery] = useState("");

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
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <Select
          value={statusFilter || "_all"}
          onValueChange={(v) => setStatusFilter((v === "_all" ? "" : v) as "" | ListingStatus)}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
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
        <Combobox
          value={categoryFilter || ""}
          onValueChange={(v) => setCategoryFilter(v ?? "")}
          onInputValueChange={(v, details) => {
            setCategoryQuery(details.reason === "input-change" ? v : "");
          }}
          itemToStringLabel={(v: string) => {
            if (!v) return "All categories";
            return categories.find((c) => c.id === v)?.name ?? v;
          }}
        >
          <ComboboxInput placeholder="All categories" className="w-full sm:w-[180px]" />
          <ComboboxContent>
            <ComboboxList>
              <ComboboxItem value="">All categories</ComboboxItem>
              {categories
                .filter((c) => !categoryQuery || c.name.toLowerCase().includes(categoryQuery.toLowerCase()))
                .map((c) => (
                  <ComboboxItem key={c.id} value={c.id}>
                    {c.name}
                  </ComboboxItem>
                ))}
            </ComboboxList>
            {categoryQuery && categories.filter((c) => c.name.toLowerCase().includes(categoryQuery.toLowerCase())).length === 0 && (
              <p className="text-muted-foreground py-2 text-center text-sm">No categories found</p>
            )}
          </ComboboxContent>
        </Combobox>
        <Combobox
          value={highlightFilter || ""}
          onValueChange={(v) => setHighlightFilter(v ?? "")}
          onInputValueChange={(v, details) => {
            setHighlightQuery(details.reason === "input-change" ? v : "");
          }}
          itemToStringLabel={(v: string) => {
            if (!v) return "All tags";
            return highlights.find((h) => h.id === v)?.label ?? v;
          }}
        >
          <ComboboxInput placeholder="All tags" className="w-full sm:w-[160px]" />
          <ComboboxContent>
            <ComboboxList>
              <ComboboxItem value="">All tags</ComboboxItem>
              {highlights
                .filter((h) => !highlightQuery || h.label.toLowerCase().includes(highlightQuery.toLowerCase()))
                .map((h) => (
                  <ComboboxItem key={h.id} value={h.id}>
                    {h.label}
                  </ComboboxItem>
                ))}
            </ComboboxList>
            {highlightQuery && highlights.filter((h) => h.label.toLowerCase().includes(highlightQuery.toLowerCase())).length === 0 && (
              <p className="text-muted-foreground py-2 text-center text-sm">No tags found</p>
            )}
          </ComboboxContent>
        </Combobox>
        {(statusFilter || categoryFilter || highlightFilter) && (
          <span className="text-sm text-muted-foreground text-center sm:text-left">
            Showing {filteredListings.length} of {listings.length}
          </span>
        )}
      </div>
      <ListingsTable
        listings={filteredListings}
        brokerSlug={brokerSlug}
        isAgencyOwner={isAgencyOwner}
        canFeature={canFeature}
      />
    </div>
  );
}
