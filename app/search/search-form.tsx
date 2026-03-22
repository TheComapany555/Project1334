"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Search, Loader2, ChevronDown, X, SlidersHorizontal } from "lucide-react";
import type { Category, ListingHighlight } from "@/lib/types/listings";

type SortOption = { value: string; label: string };

type Props = {
  categories: Category[];
  highlights: ListingHighlight[];
  sortOptions: readonly SortOption[];
  defaultValues: {
    q: string;
    category: string;
    highlight: string;
    state: string;
    suburb: string;
    price_min: string;
    price_max: string;
    revenue_min: string;
    revenue_max: string;
    profit_min: string;
    profit_max: string;
    sort: string;
  };
};

export function SearchForm({ categories, highlights, defaultValues, sortOptions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState(defaultValues.category || "");
  const [highlight, setHighlight] = useState(defaultValues.highlight || "");
  const [sort, setSort] = useState(defaultValues.sort || "newest");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [highlightQuery, setHighlightQuery] = useState("");

  // Open advanced filters if any are pre-filled
  const hasAdvanced = !!(
    defaultValues.state ||
    defaultValues.suburb ||
    defaultValues.price_min ||
    defaultValues.price_max ||
    defaultValues.revenue_min ||
    defaultValues.revenue_max ||
    defaultValues.profit_min ||
    defaultValues.profit_max
  );
  const [advancedOpen, setAdvancedOpen] = useState(hasAdvanced);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const q = (data.get("q") as string)?.trim() || "";
    const state = (data.get("state") as string)?.trim() || "";
    const suburb = (data.get("suburb") as string)?.trim() || "";
    const price_min = (data.get("price_min") as string)?.trim() || "";
    const price_max = (data.get("price_max") as string)?.trim() || "";
    const revenue_min = (data.get("revenue_min") as string)?.trim() || "";
    const revenue_max = (data.get("revenue_max") as string)?.trim() || "";
    const profit_min = (data.get("profit_min") as string)?.trim() || "";
    const profit_max = (data.get("profit_max") as string)?.trim() || "";

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category && category !== "_any") params.set("category", category);
    if (highlight && highlight !== "_any") params.set("highlight", highlight);
    if (state) params.set("state", state);
    if (suburb) params.set("suburb", suburb);
    if (price_min) params.set("price_min", price_min);
    if (price_max) params.set("price_max", price_max);
    if (revenue_min) params.set("revenue_min", revenue_min);
    if (revenue_max) params.set("revenue_max", revenue_max);
    if (profit_min) params.set("profit_min", profit_min);
    if (profit_max) params.set("profit_max", profit_max);
    if (sort && sort !== "newest") params.set("sort", sort);
    params.set("page", "1");
    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Primary filters */}
      <div className="p-4 sm:p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="search-q">Keyword</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="search-q"
                name="q"
                type="search"
                placeholder="Search title, summary..."
                defaultValue={defaultValues.q}
                className="w-full pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Combobox
              value={category || ""}
              onValueChange={(v) => setCategory(v ?? "")}
              onInputValueChange={(v, details) => {
                setCategoryQuery(details.reason === "input-change" ? v : "");
              }}
              itemToStringLabel={(v: string) => {
                if (!v) return "All categories";
                return categories.find((c) => c.slug === v)?.name ?? v;
              }}
            >
              <ComboboxInput placeholder="All categories" className="w-full" />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxItem value="">All categories</ComboboxItem>
                  {categories
                    .filter((c) => !categoryQuery || c.name.toLowerCase().includes(categoryQuery.toLowerCase()))
                    .map((c) => (
                      <ComboboxItem key={c.id} value={c.slug}>
                        {c.name}
                      </ComboboxItem>
                    ))}
                </ComboboxList>
                {categoryQuery && categories.filter((c) => c.name.toLowerCase().includes(categoryQuery.toLowerCase())).length === 0 && (
                  <p className="text-muted-foreground py-2 text-center text-sm">No categories found</p>
                )}
              </ComboboxContent>
            </Combobox>
          </div>
          <div className="space-y-2">
            <Label>Tag</Label>
            <Combobox
              value={highlight || ""}
              onValueChange={(v) => setHighlight(v ?? "")}
              onInputValueChange={(v, details) => {
                setHighlightQuery(details.reason === "input-change" ? v : "");
              }}
              itemToStringLabel={(v: string) => {
                if (!v) return "All tags";
                return highlights.find((h) => h.id === v)?.label ?? v;
              }}
            >
              <ComboboxInput placeholder="All tags" className="w-full" />
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="search-sort">Sort by</Label>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger id="search-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Advanced filters (collapsible) */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <div className="border-t border-border px-4 sm:px-6">
          <CollapsibleTrigger className="flex w-full items-center justify-between py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Advanced filters
              {hasAdvanced && (
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  !
                </span>
              )}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="border-t border-border bg-muted/40 p-4 sm:p-6 space-y-4">
            {/* Location */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Location</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="search-state">State</Label>
                  <Input id="search-state" name="state" placeholder="e.g. NSW" defaultValue={defaultValues.state} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="search-suburb">Suburb</Label>
                  <Input id="search-suburb" name="suburb" placeholder="e.g. Sydney" defaultValue={defaultValues.suburb} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Financials */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Financials</p>
              <div className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="search-price_min">Price min ($)</Label>
                    <Input id="search-price_min" name="price_min" type="number" min={0} placeholder="Min" defaultValue={defaultValues.price_min} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="search-price_max">Price max ($)</Label>
                    <Input id="search-price_max" name="price_max" type="number" min={0} placeholder="Max" defaultValue={defaultValues.price_max} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="search-revenue_min">Revenue min ($)</Label>
                    <Input id="search-revenue_min" name="revenue_min" type="number" min={0} placeholder="Optional" defaultValue={defaultValues.revenue_min} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="search-revenue_max">Revenue max ($)</Label>
                    <Input id="search-revenue_max" name="revenue_max" type="number" min={0} placeholder="Optional" defaultValue={defaultValues.revenue_max} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="search-profit_min">Profit min ($)</Label>
                    <Input id="search-profit_min" name="profit_min" type="number" min={0} placeholder="Optional" defaultValue={defaultValues.profit_min} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="search-profit_max">Profit max ($)</Label>
                    <Input id="search-profit_max" name="profit_max" type="number" min={0} placeholder="Optional" defaultValue={defaultValues.profit_max} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Actions */}
      <div className="border-t border-border bg-muted/40 px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Search
            </>
          )}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => router.push("/search")}>
          <X className="h-3.5 w-3.5" />
          Clear all
        </Button>
      </div>
    </form>
  );
}
