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
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-4 sm:p-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="search-q">Keyword</Label>
          <Input
            id="search-q"
            name="q"
            type="search"
            placeholder="Search title, summary..."
            defaultValue={defaultValues.q}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="search-category">Category</Label>
          <Select value={category || "_any"} onValueChange={(v) => setCategory(v === "_any" ? "" : v)}>
            <SelectTrigger id="search-category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_any">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="search-highlight">Tag</Label>
          <Select value={highlight || "_any"} onValueChange={(v) => setHighlight(v === "_any" ? "" : v)}>
            <SelectTrigger id="search-highlight">
              <SelectValue placeholder="All tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_any">All tags</SelectItem>
              {highlights.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="search-state">State</Label>
          <Input id="search-state" name="state" placeholder="e.g. NSW" defaultValue={defaultValues.state} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="search-suburb">Suburb</Label>
          <Input id="search-suburb" name="suburb" placeholder="e.g. Sydney" defaultValue={defaultValues.suburb} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="search-price_min">Price min ($)</Label>
          <Input id="search-price_min" name="price_min" type="number" min={0} placeholder="Min" defaultValue={defaultValues.price_min} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="search-price_max">Price max ($)</Label>
          <Input id="search-price_max" name="price_max" type="number" min={0} placeholder="Max" defaultValue={defaultValues.price_max} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="search-revenue_min">Revenue min ($)</Label>
          <Input id="search-revenue_min" name="revenue_min" type="number" min={0} placeholder="Optional" defaultValue={defaultValues.revenue_min} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="search-revenue_max">Revenue max ($)</Label>
          <Input id="search-revenue_max" name="revenue_max" type="number" min={0} placeholder="Optional" defaultValue={defaultValues.revenue_max} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="search-profit_min">Profit min ($)</Label>
          <Input id="search-profit_min" name="profit_min" type="number" min={0} placeholder="Optional" defaultValue={defaultValues.profit_min} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="search-profit_max">Profit max ($)</Label>
          <Input id="search-profit_max" name="profit_max" type="number" min={0} placeholder="Optional" defaultValue={defaultValues.profit_max} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Searching…" : "Search"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/search")}>
          Clear
        </Button>
      </div>
    </form>
  );
}
