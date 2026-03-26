"use client";

import { Check, Eye, Search, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types/products";
import type { ListingTier } from "@/lib/types/listings";

type TierOption = {
  tier: ListingTier;
  product: Product | null;
  label: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  recommended?: boolean;
};

function buildTierOptions(products: Product[]): TierOption[] {
  // Products come sorted by price ascending from getActiveProducts
  const sorted = [...products].sort((a, b) => a.price - b.price);
  const basic = sorted[0] ?? null;
  const standard = sorted[1] ?? null;
  const featured = sorted[2] ?? null;

  return [
    {
      tier: "basic",
      product: basic,
      label: "Basic",
      description: "Only people with the link can see it",
      features: [
        "Shareable link",
        "Shown on your broker profile",
      ],
      icon: <Eye className="h-5 w-5" />,
    },
    {
      tier: "standard",
      product: standard,
      label: "Standard",
      description: "Buyers can find it when browsing",
      features: [
        "All Basic features",
        "Appears in search results",
        "Shown on category pages",
      ],
      icon: <Search className="h-5 w-5" />,
      recommended: true,
    },
    {
      tier: "featured",
      product: featured,
      label: "Featured",
      description: "Get the most eyes on your listing",
      features: [
        "All Standard features",
        "Shown on the homepage",
        "Ranked higher in search",
        "Featured badge",
      ],
      icon: <Star className="h-5 w-5" />,
    },
  ];
}

function formatPrice(cents: number, currency: string): string {
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

type Props = {
  products: Product[];
  selectedTier: ListingTier;
  onSelectTier: (tier: ListingTier, productId: string | null) => void;
};

export function TierSelector({ products, selectedTier, onSelectTier }: Props) {
  const options = buildTierOptions(products);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {options.map((opt) => {
        const isSelected = selectedTier === opt.tier;
        const price = opt.product?.price ?? 0;
        const currency = opt.product?.currency ?? "aud";

        return (
          <button
            key={opt.tier}
            type="button"
            onClick={() => onSelectTier(opt.tier, opt.product?.id ?? null)}
            className={cn(
              "relative flex flex-col rounded-lg border-2 p-5 text-left transition-all hover:shadow-sm",
              isSelected
                ? "border-primary bg-primary/[0.02] ring-1 ring-primary/20"
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            {opt.recommended && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground uppercase tracking-wider">
                Recommended
              </span>
            )}

            <div className="flex items-center gap-2.5 mb-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {opt.icon}
              </div>
              <div>
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </div>

            <div className="mb-4">
              <span className="text-2xl font-bold">{formatPrice(price, currency)}</span>
              {price > 0 && opt.product?.duration_days && (
                <span className="text-xs text-muted-foreground ml-1">
                  / {opt.product.duration_days} days
                </span>
              )}
            </div>

            <ul className="space-y-1.5 flex-1">
              {opt.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isSelected ? "text-primary" : "text-muted-foreground/50"
                    )}
                  />
                  {f}
                </li>
              ))}
            </ul>

            {/* Selection indicator */}
            <div
              className={cn(
                "mt-4 flex items-center justify-center rounded-md py-2 text-xs font-medium transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isSelected ? "Selected" : "Select"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
