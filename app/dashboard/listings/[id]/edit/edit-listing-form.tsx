"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getCategories,
  getListingHighlights,
  updateListing,
  updateListingStatus,
  uploadListingImage,
  deleteListingImage,
  reorderListingImages,
} from "@/lib/actions/listings";
import type { Category, Listing, ListingHighlight } from "@/lib/types/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  category_id: z.string().uuid().nullable().optional(),
  location_text: z.string().max(200).optional(),
  state: z.string().max(100).optional(),
  suburb: z.string().max(100).optional(),
  postcode: z.string().max(20).optional(),
  price_type: z.enum(["fixed", "poa"]),
  asking_price: z.preprocess(
    (v) => (v === "" || v === undefined ? null : Number(v)),
    z.number().min(0).nullable()
  ),
  revenue: z.preprocess(
    (v) => (v === "" || v === undefined ? null : Number(v)),
    z.number().min(0).nullable()
  ),
  profit: z.preprocess(
    (v) => (v === "" || v === undefined ? null : Number(v)),
    z.number().min(0).nullable()
  ),
  lease_details: z.string().max(500).optional(),
  summary: z.string().max(500).optional(),
  description: z.string().max(10000).optional(),
  highlight_ids: z.array(z.string().uuid()),
});

type FormData = z.infer<typeof schema>;

type Props = { listing: Listing & { highlight_ids?: string[] } };

export function EditListingForm({ listing }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [highlights, setHighlights] = useState<ListingHighlight[]>([]);
  const [images, setImages] = useState<{ id: string; url: string; sort_order: number }[]>(
    (listing.listing_images ?? []).map((img) => ({
      id: img.id,
      url: img.url,
      sort_order: img.sort_order,
    }))
  );
  const [imageUploading, setImageUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      title: listing.title,
      category_id: listing.category_id ?? null,
      location_text: listing.location_text ?? "",
      state: listing.state ?? "",
      suburb: listing.suburb ?? "",
      postcode: listing.postcode ?? "",
      price_type: listing.price_type,
      asking_price: listing.asking_price ?? null,
      revenue: listing.revenue ?? null,
      profit: listing.profit ?? null,
      lease_details: listing.lease_details ?? "",
      summary: listing.summary ?? "",
      description: listing.description ?? "",
      highlight_ids: listing.highlight_ids ?? [],
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  useEffect(() => {
    Promise.all([getCategories(), getListingHighlights()]).then(([cats, hls]) => {
      setCategories(cats);
      setHighlights(hls);
    });
  }, []);

  async function onSave(data: FormData) {
    setSaving(true);
    const result = await updateListing(listing.id, {
      title: data.title,
      category_id: data.category_id || null,
      location_text: data.location_text || null,
      state: data.state || null,
      suburb: data.suburb || null,
      postcode: data.postcode || null,
      asking_price: data.asking_price ?? null,
      price_type: data.price_type,
      revenue: data.revenue ?? null,
      profit: data.profit ?? null,
      lease_details: data.lease_details || null,
      summary: data.summary || null,
      description: data.description || null,
      highlight_ids: data.highlight_ids ?? [],
    });
    setSaving(false);
    if (result.ok) {
      toast.success("Listing updated.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update.");
    }
  }

  async function onStatusChange(status: "under_offer" | "sold" | "unpublished") {
    setStatusChanging(true);
    const result = await updateListingStatus(listing.id, status);
    setStatusChanging(false);
    if (result.ok) {
      toast.success("Status updated.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update status.");
    }
  }

  async function onImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadListingImage(listing.id, formData);
    setImageUploading(false);
    if (result.ok && result.url && result.id) {
      setImages((prev) => [...prev, { id: result.id!, url: result.url!, sort_order: prev.length }]);
      toast.success("Image added.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Upload failed.");
    }
  }

  async function onImageDelete(imageId: string) {
    const result = await deleteListingImage(listing.id, imageId);
    if (result.ok) {
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success("Image removed.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to remove.");
    }
  }

  async function onMoveImage(index: number, direction: "up" | "down") {
    const newOrder = [...images];
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= newOrder.length) return;
    [newOrder[index], newOrder[swap]] = [newOrder[swap], newOrder[index]];
    setImages(newOrder);
    const result = await reorderListingImages(
      listing.id,
      newOrder.map((img) => img.id)
    );
    if (result.ok) {
      toast.success("Order updated.");
      router.refresh();
    } else {
      setImages(images);
      toast.error(result.error ?? "Failed to reorder.");
    }
  }

  const status = listing.status;
  const priceType = watch("price_type");
  const canUnderOffer = status === "published";
  const canMarkSold = status === "published" || status === "under_offer";
  const canUnpublish = status === "published" || status === "under_offer";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <Link href="/dashboard/listings">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl truncate">Edit listing</h1>
          <p className="text-muted-foreground text-sm sm:text-base truncate">{listing.title}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSave)} className="space-y-6">
        <Card>
          <CardHeader className="space-y-1.5">
            <CardTitle>Basic info</CardTitle>
            <CardDescription>Title, category, location and price.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" {...register("title")} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={watch("category_id") ?? ""}
                onValueChange={(v) => setValue("category_id", v || null)}
              >
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" {...register("state")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suburb">Suburb</Label>
                <Input id="suburb" {...register("suburb")} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input id="postcode" {...register("postcode")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location_text">Location (free text)</Label>
                <Input id="location_text" {...register("location_text")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Price type</Label>
              <Select value={watch("price_type")} onValueChange={(v) => setValue("price_type", v as "fixed" | "poa")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed price</SelectItem>
                  <SelectItem value="poa">Price on application</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {priceType === "fixed" && (
              <div className="space-y-2">
                <Label htmlFor="asking_price">Asking price ($)</Label>
                <Input id="asking_price" type="number" min={0} {...register("asking_price")} />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="revenue">Revenue ($)</Label>
                <Input id="revenue" type="number" min={0} {...register("revenue")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profit">Profit ($)</Label>
                <Input id="profit" type="number" min={0} {...register("profit")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lease_details">Lease details</Label>
              <Input id="lease_details" {...register("lease_details")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>Summary and description.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea id="summary" {...register("summary")} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} rows={8} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
            <CardDescription>Up to 10 images, 5MB each. Order is used for the gallery.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              {images.map((img, index) => (
                <div key={img.id} className="relative flex flex-col items-center gap-2">
                  <div className="relative h-24 w-32 overflow-hidden rounded border bg-muted">
                    <Image src={img.url} alt="" fill className="object-cover" sizes="128px" />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === 0}
                      onClick={() => onMoveImage(index, "up")}
                    >
                      <HugeiconsIcon icon={ArrowUp01Icon} className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === images.length - 1}
                      onClick={() => onMoveImage(index, "down")}
                    >
                      <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => onImageDelete(img.id)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {images.length < 10 && (
                <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-muted-foreground/30 bg-muted/30 text-muted-foreground hover:bg-muted/50">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={onImageUpload}
                    disabled={imageUploading}
                  />
                  <span className="text-xs">{imageUploading ? "Uploading…" : "Add image"}</span>
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Highlights</CardTitle>
            <CardDescription>Tags shown on the public listing.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {highlights.map((h) => {
                const ids = watch("highlight_ids") ?? [];
                const checked = ids.includes(h.id);
                return (
                  <label key={h.id} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) setValue("highlight_ids", [...ids, h.id]);
                        else setValue("highlight_ids", ids.filter((id) => id !== h.id));
                      }}
                      className="rounded border-input"
                    />
                    <span>{h.label}</span>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {canUnderOffer && (
            <Button type="button" variant="secondary" disabled={statusChanging} onClick={() => onStatusChange("under_offer")}>
              Under offer
            </Button>
          )}
          {canMarkSold && (
            <Button type="button" variant="secondary" disabled={statusChanging} onClick={() => onStatusChange("sold")}>
              Mark sold
            </Button>
          )}
          {canUnpublish && (
            <Button type="button" variant="outline" disabled={statusChanging} onClick={() => onStatusChange("unpublished")}>
              Unpublish
            </Button>
          )}
          {listing.status === "published" && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/listing/${listing.slug}`} target="_blank" rel="noopener noreferrer">
                View public page
              </Link>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
