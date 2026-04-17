"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Star,
  Loader2,
  Check,
  Home,
  Layers,
  Sparkles,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type FeaturedScope,
  FEATURED_SCOPE_LABELS,
  type Product,
} from "@/lib/types/products";
import type { Category } from "@/lib/types/listings";
import { cn } from "@/lib/utils";

type ListingSummary = {
  id: string;
  title: string;
  slug: string;
  category: Category | null;
  featured_homepage_until: string | null;
  featured_category_until: string | null;
};

type Props = {
  listing: ListingSummary;
  options: {
    homepage: Product[];
    category: Product[];
    both: Product[];
  };
};

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const SCOPE_ICONS: Record<FeaturedScope, React.ReactNode> = {
  homepage: <Home className="h-4 w-4" />,
  category: <Layers className="h-4 w-4" />,
  both: <Sparkles className="h-4 w-4" />,
};

const SCOPE_DESCRIPTIONS: Record<FeaturedScope, (categoryName?: string) => string> = {
  homepage: () => "Featured slot on the main marketplace homepage.",
  category: (cat) =>
    cat
      ? `Featured at the top of the ${cat} category page.`
      : "Featured at the top of its category page.",
  both: (cat) =>
    cat
      ? `Featured on the homepage AND at the top of ${cat}.`
      : "Featured on the homepage AND at the top of its category page.",
};

export function FeatureListingView({ listing, options }: Props) {
  const router = useRouter();
  const [selectedScope, setSelectedScope] = useState<FeaturedScope>("homepage");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const productsForScope = useMemo(() => {
    return selectedScope === "homepage"
      ? options.homepage
      : selectedScope === "category"
        ? options.category
        : options.both;
  }, [selectedScope, options]);

  const categoryName = listing.category?.name ?? null;

  const scopeAvailability: Record<FeaturedScope, { available: boolean; reason?: string }> = {
    homepage: {
      available: options.homepage.length > 0,
      reason: options.homepage.length === 0 ? "No homepage packages set up" : undefined,
    },
    category: {
      available: options.category.length > 0,
      reason: !listing.category
        ? "Set a category on this listing first"
        : options.category.length === 0
          ? `No packages priced for ${categoryName ?? "this category"}`
          : undefined,
    },
    both: {
      available: options.both.length > 0,
      reason: options.both.length === 0 ? "No bundle packages available" : undefined,
    },
  };

  const handleScopeChange = (scope: FeaturedScope) => {
    if (!scopeAvailability[scope].available) return;
    setSelectedScope(scope);
    setSelectedProductId(null);
  };

  const handleCheckout = async () => {
    if (!selectedProductId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          productId: selectedProductId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        toast.error(json.error ?? "Failed to start checkout");
        return;
      }
      window.location.href = json.url;
    } catch {
      toast.error("Failed to start checkout");
      setSubmitting(false);
    }
  };

  const homepageActive =
    listing.featured_homepage_until &&
    new Date(listing.featured_homepage_until) > new Date();
  const categoryActive =
    listing.featured_category_until &&
    new Date(listing.featured_category_until) > new Date();

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/dashboard/listings/${listing.id}/edit`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
            Feature this listing
          </h1>
          <p className="text-sm text-muted-foreground truncate max-w-xl">
            Pay to boost &quot;{listing.title}&quot; in front of more buyers.
          </p>
        </div>
      </div>

      {/* Active feature status */}
      {(homepageActive || categoryActive) && (
        <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              Currently featured
            </CardTitle>
            <CardDescription>
              Renewing or extending will add days on top of the existing expiry.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {homepageActive && listing.featured_homepage_until && (
              <p>
                Homepage until{" "}
                <span className="font-medium">
                  {formatDateShort(listing.featured_homepage_until)}
                </span>
              </p>
            )}
            {categoryActive && listing.featured_category_until && (
              <p>
                {categoryName ?? "Category"} until{" "}
                <span className="font-medium">
                  {formatDateShort(listing.featured_category_until)}
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1: choose scope */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">1. Choose where to feature</CardTitle>
          <CardDescription>
            Different placements have different prices.
            {categoryName ? ` Category pricing applies to ${categoryName}.` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {(["homepage", "category", "both"] as FeaturedScope[]).map((scope) => {
            const avail = scopeAvailability[scope];
            const active = selectedScope === scope;
            return (
              <button
                key={scope}
                type="button"
                onClick={() => handleScopeChange(scope)}
                disabled={!avail.available}
                className={cn(
                  "rounded-lg border p-4 text-left transition",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/40",
                  !avail.available && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-primary">{SCOPE_ICONS[scope]}</span>
                  <p className="text-sm font-semibold">
                    {FEATURED_SCOPE_LABELS[scope]}
                  </p>
                  {active && <Check className="h-4 w-4 text-primary ml-auto" />}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {SCOPE_DESCRIPTIONS[scope](categoryName ?? undefined)}
                </p>
                {!avail.available && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {avail.reason}
                  </p>
                )}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Step 2: pick a duration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">2. Pick a duration</CardTitle>
          <CardDescription>
            Featured packages are one-time payments. They do not auto-renew.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productsForScope.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No packages available for this placement.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {productsForScope.map((p) => {
                const active = selectedProductId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProductId(p.id)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold">{p.name}</p>
                      {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                    {p.duration_days && (
                      <Badge variant="outline" className="text-[10px] mb-2">
                        {p.duration_days} days
                      </Badge>
                    )}
                    <p className="text-lg font-bold">
                      {formatPrice(p.price, p.currency)}
                    </p>
                    {p.description && (
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                        {p.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Included with every featured package</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Featured badge on the listing card and detail page</li>
          <li>Priority ranking ahead of non-featured listings</li>
          <li>Highlighted styling in search results</li>
          <li>One-time payment, no recurring charges</li>
        </ul>
      </div>

      <Button
        onClick={handleCheckout}
        disabled={!selectedProductId || submitting}
        className="w-full sm:w-auto gap-2"
        size="lg"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirecting to payment
          </>
        ) : (
          <>
            <Star className="h-4 w-4" />
            Continue to payment
          </>
        )}
      </Button>
    </div>
  );
}
