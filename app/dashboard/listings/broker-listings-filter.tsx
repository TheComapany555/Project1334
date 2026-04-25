"use client";

import * as React from "react";
import type {
  Category,
  Listing,
  ListingHighlight,
  ListingStatus,
} from "@/lib/types/listings";
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
import { useTableUrlState } from "@/hooks/use-table-url-state";
import type { Paginated } from "@/lib/types/pagination";

const STATUS_OPTIONS: { value: "_all" | ListingStatus; label: string }[] = [
  { value: "_all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "under_offer", label: "Under offer" },
  { value: "sold", label: "Sold" },
  { value: "unpublished", label: "Unpublished" },
];

type Props = {
  result: Paginated<Listing & { listing_highlights?: ListingHighlight[] }>;
  categories: Category[];
  highlights: ListingHighlight[];
  brokerSlug?: string;
  isAgencyOwner?: boolean;
  canFeature?: boolean;
};

/**
 * Status filter is server-driven (URL param). Category and highlight filters
 * remain client-side because the broker's listing count is typically small;
 * if that grows, push them into the action's params too.
 */
export function BrokerListingsWithFilter({
  result,
  categories,
  highlights,
  brokerSlug,
  isAgencyOwner,
  canFeature,
}: Props) {
  const { state, setFilter } = useTableUrlState({ filterKeys: ["status"] });
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [highlightFilter, setHighlightFilter] = React.useState("");
  const [categoryQuery, setCategoryQuery] = React.useState("");
  const [highlightQuery, setHighlightQuery] = React.useState("");
  const [, startTransition] = React.useTransition();

  const filteredListings = React.useMemo(() => {
    return result.rows.filter((listing) => {
      if (categoryFilter && listing.category_id !== categoryFilter) return false;
      if (highlightFilter) {
        const ids = listing.listing_highlights?.map((h) => h.id) ?? [];
        if (!ids.includes(highlightFilter)) return false;
      }
      return true;
    });
  }, [result.rows, categoryFilter, highlightFilter]);

  const statusValue = state.filters.status ?? "_all";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <Select
          value={statusValue}
          onValueChange={(v) =>
            startTransition(() =>
              setFilter("status", v === "_all" ? null : v),
            )
          }
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
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
                .filter(
                  (c) =>
                    !categoryQuery ||
                    c.name.toLowerCase().includes(categoryQuery.toLowerCase()),
                )
                .map((c) => (
                  <ComboboxItem key={c.id} value={c.id}>
                    {c.name}
                  </ComboboxItem>
                ))}
            </ComboboxList>
            {categoryQuery &&
              categories.filter((c) =>
                c.name.toLowerCase().includes(categoryQuery.toLowerCase()),
              ).length === 0 && (
                <p className="text-muted-foreground py-2 text-center text-sm">
                  No categories found
                </p>
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
                .filter(
                  (h) =>
                    !highlightQuery ||
                    h.label.toLowerCase().includes(highlightQuery.toLowerCase()),
                )
                .map((h) => (
                  <ComboboxItem key={h.id} value={h.id}>
                    {h.label}
                  </ComboboxItem>
                ))}
            </ComboboxList>
            {highlightQuery &&
              highlights.filter((h) =>
                h.label.toLowerCase().includes(highlightQuery.toLowerCase()),
              ).length === 0 && (
                <p className="text-muted-foreground py-2 text-center text-sm">
                  No tags found
                </p>
              )}
          </ComboboxContent>
        </Combobox>
      </div>
      <ListingsTable
        result={{ ...result, rows: filteredListings }}
        brokerSlug={brokerSlug}
        isAgencyOwner={isAgencyOwner}
        canFeature={canFeature}
      />
    </div>
  );
}
