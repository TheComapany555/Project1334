"use client";

import {
  useState,
  useTransition,
  useRef,
  useEffect,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addToComparison,
  removeFromComparison,
  clearComparison,
  getComparisonListings,
} from "@/lib/actions/comparison";
import type { Listing } from "@/lib/types/listings";
import {
  X,
  ExternalLink,
  Trash2,
  MapPin,
  Plus,
  Search,
  ChevronDown,
} from "lucide-react";

// ── Types ──

type PickerListing = {
  id: string;
  title: string;
  slug: string;
  location: string;
  image: string | null;
};

type Props = {
  listings: Listing[];
  allListings: PickerListing[];
};

// ── Helpers ──

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

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

type ComparisonRow = {
  label: string;
  getValue: (listing: Listing) => string;
  bestIs?: "lowest" | "highest";
};

const COMPARISON_ROWS: ComparisonRow[] = [
  { label: "Asking Price", getValue: formatPrice, bestIs: "lowest" },
  { label: "Revenue", getValue: (l) => formatCurrency(l.revenue), bestIs: "highest" },
  { label: "Profit", getValue: (l) => formatCurrency(l.profit), bestIs: "highest" },
  { label: "Category", getValue: (l) => l.category?.name ?? "—" },
  {
    label: "Location",
    getValue: (l) =>
      l.location_text || [l.suburb, l.state].filter(Boolean).join(", ") || "—",
  },
  { label: "Lease", getValue: (l) => l.lease_details ?? "—" },
  {
    label: "ROI",
    getValue: (l) => {
      const price = Number(l.asking_price) || 0;
      const profit = Number(l.profit) || 0;
      if (price > 0 && profit > 0) return `${((profit / price) * 100).toFixed(1)}%`;
      return "—";
    },
    bestIs: "highest",
  },
];

// ── Listing Picker Dropdown ──

function ListingPicker({
  allListings,
  excludeIds,
  selected,
  onSelect,
  onClear,
}: {
  allListings: PickerListing[];
  excludeIds: string[];
  selected: Listing | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = allListings.filter(
    (l) =>
      !excludeIds.includes(l.id) &&
      (query.length === 0 || l.title.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (selected) {
    const image = selected.listing_images?.[0]?.url;
    return (
      <Card className="relative overflow-hidden border-primary/30">
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm rounded-full"
          onClick={onClear}
        >
          <X className="h-3 w-3" />
        </Button>
        {image ? (
          <div className="relative aspect-[16/10] w-full bg-muted">
            <Image src={image} alt={selected.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
        ) : (
          <div className="aspect-[16/10] w-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No image</span>
          </div>
        )}
        <CardContent className="p-3 space-y-1">
          <Link href={`/listing/${selected.slug}`} className="text-xs sm:text-sm font-medium leading-snug hover:underline line-clamp-2">
            {selected.title}
          </Link>
          <p className="text-xs font-semibold text-primary">{formatPrice(selected)}</p>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">
              {selected.location_text || [selected.suburb, selected.state].filter(Boolean).join(", ") || "—"}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative h-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen(!open);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="w-full h-full min-h-[120px] flex items-center justify-between gap-2 rounded-lg border-2 border-dashed border-border hover:border-primary/50 px-4 transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
          <Search className="h-4 w-4" />
          <span className="text-sm">Select a listing...</span>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-xl overflow-hidden"
        >
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                placeholder="Search by name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No listings found</p>
            ) : (
              filtered.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-primary/5 transition-colors border-b border-border/50 last:border-b-0"
                  onClick={() => {
                    onSelect(l.id);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  {l.image ? (
                    <div className="relative h-9 w-14 shrink-0 rounded overflow-hidden bg-muted">
                      <Image src={l.image} alt="" fill className="object-cover" sizes="56px" />
                    </div>
                  ) : (
                    <div className="h-9 w-14 shrink-0 rounded bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{l.title}</p>
                    {l.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />
                        {l.location}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

export function ComparisonTable({ listings: initialListings, allListings }: Props) {
  const [listings, setListings] = useState(initialListings);
  const [slotCount, setSlotCount] = useState(Math.max(2, initialListings.length));
  const [isPending, startTransition] = useTransition();
  const MAX_SLOTS = 6;

  const handleRemove = (listingId: string) => {
    startTransition(async () => {
      const result = await removeFromComparison(listingId);
      if (result.ok) setListings((prev) => prev.filter((l) => l.id !== listingId));
    });
  };

  const handleClearAll = () => {
    startTransition(async () => {
      const result = await clearComparison();
      if (result.ok) {
        setListings([]);
        setSlotCount(2);
      }
    });
  };

  const handleAdd = (listingId: string) => {
    startTransition(async () => {
      const result = await addToComparison(listingId);
      if (result.ok) {
        const updated = await getComparisonListings([...listings.map((l) => l.id), listingId]);
        setListings(updated);
      }
    });
  };

  const addSlot = () => {
    if (slotCount < MAX_SLOTS) setSlotCount((c) => c + 1);
  };

  const excludeIds = listings.map((l) => l.id);

  return (
    <div className="space-y-6">
      {/* ── Slot Selectors ── */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 overflow-visible">
        {Array.from({ length: slotCount }).map((_, i) => (
          <ListingPicker
            key={i}
            allListings={allListings}
            excludeIds={excludeIds}
            selected={listings[i] ?? null}
            onSelect={handleAdd}
            onClear={() => listings[i] && handleRemove(listings[i].id)}
          />
        ))}
      </div>

      {/* Add more + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {slotCount < MAX_SLOTS && (
            <Button variant="outline" size="sm" onClick={addSlot} className="border-primary text-primary hover:bg-primary/5">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add another listing
            </Button>
          )}
          {listings.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {listings.length} of {slotCount} selected
            </span>
          )}
        </div>
        {listings.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={isPending} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Clear all
          </Button>
        )}
      </div>

      {/* ── Comparison Table ── */}
      {listings.length >= 2 && (
        <Card className="border-primary/20 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary border-primary">
                <TableHead className="text-primary-foreground font-medium w-36 sm:w-44">
                  Specification
                </TableHead>
                {listings.map((l) => (
                  <TableHead key={l.id} className="text-primary-foreground font-medium min-w-[160px]">
                    <Link href={`/listing/${l.slug}`} className="hover:underline line-clamp-1">
                      {l.title}
                    </Link>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMPARISON_ROWS.map((row, idx) => {
                let bestVal: number | null = null;
                if (row.bestIs && listings.length >= 2) {
                  const nums = listings
                    .map((l) => {
                      const v = row.getValue(l);
                      if (v === "—" || v === "POA") return null;
                      return parseFloat(v.replace(/[^0-9.-]/g, ""));
                    })
                    .filter((n): n is number => n !== null && !isNaN(n));
                  if (nums.length >= 2) {
                    bestVal = row.bestIs === "lowest" ? Math.min(...nums) : Math.max(...nums);
                  }
                }

                return (
                  <TableRow key={row.label} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                    <TableCell className="text-muted-foreground font-medium">
                      {row.label}
                    </TableCell>
                    {listings.map((listing) => {
                      const val = row.getValue(listing);
                      let isBest = false;
                      if (bestVal !== null && val !== "—" && val !== "POA") {
                        isBest = parseFloat(val.replace(/[^0-9.-]/g, "")) === bestVal;
                      }
                      return (
                        <TableCell key={`${row.label}-${listing.id}`} className={isBest ? "text-primary font-semibold" : ""}>
                          {val}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}

              {/* Highlights row */}
              <TableRow className={COMPARISON_ROWS.length % 2 === 0 ? "bg-muted/30" : ""}>
                <TableCell className="text-muted-foreground font-medium">Highlights</TableCell>
                {listings.map((listing) => (
                  <TableCell key={`hl-${listing.id}`}>
                    {listing.listing_highlights?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {listing.listing_highlights.map((h) => (
                          <Badge key={h.id} variant="secondary" className="text-[10px]">
                            {h.label}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>

              {/* View link row */}
              <TableRow>
                <TableCell />
                {listings.map((listing) => (
                  <TableCell key={`link-${listing.id}`}>
                    <Button variant="outline" size="xs" asChild className="border-primary text-primary hover:bg-primary/5">
                      <Link href={`/listing/${listing.slug}`}>
                        View Details
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}

      {listings.length === 1 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Select one more listing to see the comparison table.
        </p>
      )}
    </div>
  );
}
