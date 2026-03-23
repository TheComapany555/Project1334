"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createProduct, updateProduct } from "@/lib/actions/products";
import type { Product } from "@/lib/types/products";
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
});

type FormValues = z.infer<typeof productSchema>;

type ProductFormProps = {
  product?: Product;
};

export function ProductForm({ product }: ProductFormProps) {
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
    },
  });

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

    setIsSubmitting(true);
    try {
      const priceInCents = Math.round(priceNum * 100);
      const durationDays = durationNum || null;

      if (isEdit && product) {
        const res = await updateProduct(product.id, {
          name: values.name,
          description: values.description || null,
          price: priceInCents,
          currency: values.currency,
          duration_days: durationDays,
          product_type: values.product_type,
        });
        if (res.ok) {
          toast.success("Plan updated");
          router.refresh();
          router.push("/admin/products");
        } else {
          toast.error(res.error ?? "Failed to update product");
        }
      } else {
        const res = await createProduct({
          name: values.name,
          description: values.description || null,
          price: priceInCents,
          currency: values.currency,
          duration_days: durationDays,
          product_type: values.product_type,
        });
        if (res.ok) {
          toast.success("Plan created");
          router.refresh();
          router.push("/admin/products");
        } else {
          toast.error(res.error ?? "Failed to create product");
        }
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
