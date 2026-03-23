"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Star, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActiveProducts } from "@/lib/actions/products";
import type { Product } from "@/lib/types/products";

type UpgradeModalProps = {
  listingId: string;
  listingTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function UpgradeModal({
  listingId,
  listingTitle,
  open,
  onOpenChange,
}: UpgradeModalProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    if (open) {
      setIsLoadingProducts(true);
      getActiveProducts()
        .then(setProducts)
        .finally(() => setIsLoadingProducts(false));
    }
  }, [open]);

  function handleContinue() {
    if (!selectedProductId) return;
    setIsLoading(true);
    router.push(`/checkout?listing=${listingId}&product=${selectedProductId}`);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            Upgrade to Featured
          </AlertDialogTitle>
          <AlertDialogDescription>
            Boost <span className="font-medium text-foreground">{listingTitle}</span> with
            a featured listing to increase visibility and attract more buyers.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No packages available at the moment.
              </p>
            </div>
          ) : (
            products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelectedProductId(product.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors",
                  selectedProductId === product.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.description ??
                      (product.duration_days
                        ? `${product.duration_days} days of premium visibility`
                        : "Premium visibility")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold">
                    {formatPrice(product.price, product.currency)}
                  </span>
                  {selectedProductId === product.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">What you get:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Featured badge on your listing</li>
            <li>Priority ranking in search results</li>
            <li>Highlighted listing display</li>
            <li>Expires automatically, no recurring charge</li>
          </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button
            onClick={handleContinue}
            disabled={!selectedProductId || isLoading || products.length === 0}
            className="gap-1.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <Star className="h-4 w-4" />
                Continue to payment
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
