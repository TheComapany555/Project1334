"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Loader2, Check, Home, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFeaturedOptionsForListing } from "@/lib/actions/products";
import type { Product } from "@/lib/types/products";

/**
 * One-time "make this listing stand out" dialog, shown right after a broker
 * publishes a listing while the platform is in free mode with the Featured
 * upsell switched on (site_settings.promote_featured).
 *
 * Deliberately soft-sell: publishing already worked and the listing is already
 * live and searchable. This only offers the paid extras (homepage rail,
 * top-of-search ranking, badge). Dismissal is remembered per listing in
 * localStorage so a broker is never asked twice for the same listing.
 */

const DISMISS_KEY = "salebiz_feature_upsell_dismissed";

/** Listing ids the broker has already dismissed or acted on. */
function readDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function rememberDismissed(listingId: string) {
  try {
    const next = [...new Set([...readDismissed(), listingId])].slice(-200);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  } catch {
    // Private windows / blocked storage: the dialog may show again next time,
    // which is acceptable. Never let this break publishing.
  }
}

/** True when this listing has never been offered the upsell before. */
export function shouldOfferFeatureUpsell(listingId: string): boolean {
  return !readDismissed().includes(listingId);
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function durationLabel(product: Product): string {
  return product.duration_days ? `${product.duration_days} days` : "One-off";
}

type Props = {
  listingId: string;
  listingTitle: string;
  /** Listing's top-level category, used to offer category placements. */
  categoryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FeatureUpsellDialog({
  listingId,
  listingTitle,
  categoryId,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  // The dialog is only mounted while it is being shown (callers render it
  // conditionally), so packages are fetched once on mount rather than on an
  // `open` transition. Starting in the loading state keeps this effect free of
  // synchronous setState.
  useEffect(() => {
    let active = true;
    getFeaturedOptionsForListing(categoryId)
      .then((opts) => {
        if (!active) return;
        // Cheapest-first across every scope the listing qualifies for, so the
        // lowest-commitment option is what the broker sees first.
        const all = [...opts.both, ...opts.homepage, ...opts.category].sort(
          (a, b) => a.price - b.price,
        );
        setProducts(all);
        setSelectedId(all[0]?.id ?? null);
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, [categoryId]);

  const hasOptions = products.length > 0;

  const benefits = useMemo(
    () => [
      { icon: Home, text: "Shown on the Salebiz homepage" },
      { icon: Search, text: "Ranked above other listings in search" },
      { icon: Sparkles, text: "Featured badge on your listing card" },
    ],
    [],
  );

  function close(remember: boolean) {
    if (remember) rememberDismissed(listingId);
    onOpenChange(false);
  }

  function handleFeature() {
    if (!selectedId) return;
    setRedirecting(true);
    // Acting on the offer also counts as answering it, so the broker is not
    // asked again for this listing if they abandon checkout.
    rememberDismissed(listingId);
    router.push(`/checkout?listing=${listingId}&product=${selectedId}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Closing by overlay/escape counts as "no thanks" for this listing.
        if (!next) close(true);
        else onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
            <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
          </div>
          <DialogTitle className="text-center">
            Want more buyers to see it?
          </DialogTitle>
          <DialogDescription className="text-center">
            <span className="font-medium text-foreground">{listingTitle}</span> is
            live and free to keep. Feature it to reach the homepage and the top of
            search.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 px-4 py-3">
          <ul className="space-y-2">
            {benefits.map((b) => (
              <li key={b.text} className="flex items-center gap-2.5 text-sm">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-background">
                  <b.icon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <span>{b.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {loadingProducts ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !hasOptions ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No featured packages are available right now.
          </p>
        ) : (
          <div className="space-y-2">
            {products.map((product) => {
              const selected = selectedId === product.id;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedId(product.id)}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/30",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {durationLabel(product)}
                      </Badge>
                    </div>
                    {product.description && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold">
                      {formatPrice(product.price, product.currency)}
                    </span>
                    {selected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => close(true)}
            disabled={redirecting}
          >
            No thanks
          </Button>
          <Button
            type="button"
            onClick={handleFeature}
            disabled={!selectedId || !hasOptions || redirecting}
            className="gap-1.5"
          >
            {redirecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <Star className="h-4 w-4" />
                Feature my listing
              </>
            )}
          </Button>
        </DialogFooter>

        <p className="text-center text-[11px] text-muted-foreground">
          One-time payment, no subscription. Your listing stays published either way.
        </p>
      </DialogContent>
    </Dialog>
  );
}
