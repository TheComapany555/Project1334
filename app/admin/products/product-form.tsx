"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createProduct, updateProduct } from "@/lib/actions/products";
import type { FeaturedScope, Product } from "@/lib/types/products";
import { FEATURED_SCOPE_LABELS } from "@/lib/types/products";
import type { Category } from "@/lib/types/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  price: z.string().min(1, "Price is required"),
  currency: z.string().min(1),
  duration_days: z.string().optional().or(z.literal("")),
  product_type: z.enum(["featured", "listing_tier", "subscription"]),
  scope: z.enum(["homepage", "category", "both", "none"]),
  category_id: z.string(),
});

type FormValues = z.infer<typeof productSchema>;

type ProductFormProps = {
  product?: Product;
  categories: Category[];
};

const SCOPE_HELP: Record<FeaturedScope, string> = {
  homepage: "Sells the homepage feature slot. Category is ignored.",
  category:
    "Sells the per-category feature slot. Pick which category this price applies to.",
  both: "Sells homepage + category bundle. Optionally pin to a single category.",
};

export function ProductForm({ product, categories }: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!product;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      price: product ? String(product.price / 100) : "",
      currency: product?.currency ?? "aud",
      duration_days: product?.duration_days ? String(product.duration_days) : "",
      product_type: product?.product_type ?? "featured",
      scope: (product?.scope as FormValues["scope"] | undefined) ?? "homepage",
      category_id: product?.category_id ?? "",
    },
  });

  const productType = watch("product_type");
  const scope = watch("scope");
  const isFeatured = productType === "featured";
  const showCategory = isFeatured && (scope === "category" || scope === "both");
  const categoryRequired = isFeatured && scope === "category";

  async function onSubmit(values: FormValues) {
    const priceNum = parseFloat(values.price);
    if (isNaN(priceNum) || priceNum < 0.01) {
      toast.error("Price must be at least $0.01");
      return;
    }
    const durationNum = values.duration_days ? parseInt(values.duration_days, 10) : null;
    if (values.duration_days && (isNaN(durationNum!) || durationNum! < 1)) {
      toast.error("Duration must be at least 1 day");
      return;
    }

    if (categoryRequired && !values.category_id) {
      toast.error("Pick a category for category-scoped pricing");
      return;
    }

    setIsSubmitting(true);
    try {
      const priceInCents = Math.round(priceNum * 100);
      const durationDays = durationNum || null;

      const resolvedScope: FeaturedScope | null = isFeatured
        ? (values.scope as FeaturedScope)
        : null;
      const resolvedCategoryId = isFeatured && showCategory && values.category_id
        ? values.category_id
        : null;

      const payload = {
        name: values.name,
        description: values.description || null,
        price: priceInCents,
        currency: values.currency,
        duration_days: durationDays,
        product_type: values.product_type,
        scope: resolvedScope,
        category_id: resolvedCategoryId,
      };

      const res = isEdit && product
        ? await updateProduct(product.id, payload)
        : await createProduct(payload);

      if (res.ok) {
        toast.success(isEdit ? "Plan updated" : "Plan created");
        router.refresh();
        router.push("/admin/products");
      } else {
        toast.error(res.error ?? `Failed to ${isEdit ? "update" : "create"} product`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register("name")} placeholder="e.g. Featured Listing (7 Days)" />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Brief description of what this plan includes"
          rows={3}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <Select
          value={watch("product_type")}
          onValueChange={(v) =>
            setValue("product_type", v as "featured" | "listing_tier" | "subscription")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">Featured upgrade</SelectItem>
            <SelectItem value="listing_tier">Listing visibility level</SelectItem>
            <SelectItem value="subscription">Subscription plan</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Controls where this plan appears for agencies.
        </p>
      </div>

      {isFeatured && (
        <div className="space-y-2">
          <Label>Placement scope</Label>
          <Select
            value={watch("scope")}
            onValueChange={(v) => setValue("scope", v as FormValues["scope"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["homepage", "category", "both"] as FeaturedScope[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {FEATURED_SCOPE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{SCOPE_HELP[scope as FeaturedScope]}</p>
        </div>
      )}

      {showCategory && (
        <div className="space-y-2">
          <Label htmlFor="category_id">
            Category {categoryRequired && <span className="text-destructive">*</span>}
            {!categoryRequired && (
              <span className="text-xs text-muted-foreground font-normal ml-1">
                (optional, leave empty to apply to all categories)
              </span>
            )}
          </Label>
          <Select
            value={watch("category_id") || "__none"}
            onValueChange={(v) => setValue("category_id", v === "__none" ? "" : v)}
          >
            <SelectTrigger id="category_id">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {!categoryRequired && (
                <SelectItem value="__none">All categories</SelectItem>
              )}
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price (AUD)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0.01"
            {...register("price")}
            placeholder="49.00"
          />
          <FieldError message={errors.price?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration_days">Duration (days)</Label>
          <Input
            id="duration_days"
            type="number"
            min="1"
            {...register("duration_days")}
            placeholder="e.g. 7"
          />
          <FieldError message={errors.duration_days?.message} />
          <p className="text-xs text-muted-foreground">
            How long the feature is active after purchase.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="gap-1.5">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save changes" : "Create plan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/products")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
