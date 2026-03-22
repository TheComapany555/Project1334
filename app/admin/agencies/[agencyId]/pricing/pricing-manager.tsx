"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, DollarSign, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  upsertAgencyPricing,
  deleteAgencyPricing,
} from "@/lib/actions/admin-pricing";
import type { Product } from "@/lib/types/products";
import type { AgencyPricingOverride } from "@/lib/types/agency-pricing";

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

type Props = {
  agencyId: string;
  agencyName: string;
  products: Product[];
  overrides: AgencyPricingOverride[];
};

export function AgencyPricingManager({
  agencyId,
  agencyName,
  products,
  overrides,
}: Props) {
  const router = useRouter();
  const overrideMap = new Map(overrides.map((o) => [o.product_id, o]));

  return (
    <div className="space-y-4">
      {products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No products available for custom pricing.
          </CardContent>
        </Card>
      ) : (
        products.map((product) => {
          const override = overrideMap.get(product.id);
          return (
            <PricingRow
              key={product.id}
              agencyId={agencyId}
              product={product}
              override={override ?? null}
              onSaved={() => router.refresh()}
            />
          );
        })
      )}
    </div>
  );
}

function PricingRow({
  agencyId,
  product,
  override,
  onSaved,
}: {
  agencyId: string;
  product: Product;
  override: AgencyPricingOverride | null;
  onSaved: () => void;
}) {
  const [customPrice, setCustomPrice] = useState(
    override ? String(override.custom_price / 100) : ""
  );
  const [notes, setNotes] = useState(override?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const hasOverride = !!override;
  const defaultPriceDollars = product.price / 100;

  async function handleSave() {
    const priceNum = parseFloat(customPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid price.");
      return;
    }
    setSaving(true);
    const result = await upsertAgencyPricing({
      agency_id: agencyId,
      product_id: product.id,
      custom_price: Math.round(priceNum * 100),
      currency: product.currency,
      notes: notes || null,
    });
    setSaving(false);
    if (result.ok) {
      toast.success(`Custom price saved for ${product.name}`);
      onSaved();
    } else {
      toast.error(result.error ?? "Failed to save.");
    }
  }

  async function handleRemove() {
    if (!override) return;
    setRemoving(true);
    const result = await deleteAgencyPricing(override.id);
    setRemoving(false);
    if (result.ok) {
      toast.success(`Reverted to default price for ${product.name}`);
      setCustomPrice("");
      setNotes("");
      onSaved();
    } else {
      toast.error(result.error ?? "Failed to remove.");
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{product.name}</CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                {product.product_type}
              </Badge>
              {hasOverride && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                  Custom price
                </Badge>
              )}
            </div>
            {product.description && (
              <CardDescription className="text-xs">
                {product.description}
              </CardDescription>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Default price</p>
            <p className="text-sm font-semibold">
              {formatPrice(product.price, product.currency)}
            </p>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor={`price-${product.id}`} className="text-xs">
              Custom price (AUD)
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id={`price-${product.id}`}
                type="number"
                step="0.01"
                min="0"
                placeholder={String(defaultPriceDollars)}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`notes-${product.id}`} className="text-xs">
              Notes
            </Label>
            <Input
              id={`notes-${product.id}`}
              placeholder="e.g. Agreed in contract #123"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !customPrice}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
            {hasOverride && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRemove}
                disabled={removing}
                className="gap-1.5 text-muted-foreground"
              >
                {removing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Reset
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
