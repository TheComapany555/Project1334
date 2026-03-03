"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getCategories,
  getListingHighlights,
  createListing,
  uploadListingImage,
} from "@/lib/actions/listings";
import type { Category, ListingHighlight } from "@/lib/types/listings";
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
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, Delete02Icon } from "@hugeicons/core-free-icons";

const MAX_IMAGES_PER_LISTING = 10;
const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp,image/gif";

const step1Schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  category_id: z.union([z.string().uuid(), z.literal("")]).transform((v) => (v === "" ? null : v)),
  location_text: z.string().max(200).optional(),
  state: z.string().max(100).optional(),
  suburb: z.string().max(100).optional(),
  postcode: z.string().max(20).optional(),
  price_type: z.enum(["fixed", "poa"]),
  asking_price: z.coerce.number().min(0).nullable(),
  revenue: z.coerce.number().min(0).nullable(),
  profit: z.coerce.number().min(0).nullable(),
  lease_details: z.string().max(500).optional(),
});

const step2Schema = z.object({
  summary: z.string().max(500).optional(),
  description: z.string().max(10000).optional(),
});

const step3Schema = z.object({
  highlight_ids: z.array(z.string().uuid()),
});

const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema);
type FormData = z.infer<typeof fullSchema>;

const defaultValues: FormData = {
  title: "",
  category_id: null,
  location_text: "",
  state: "",
  suburb: "",
  postcode: "",
  price_type: "fixed",
  asking_price: null,
  revenue: null,
  profit: null,
  lease_details: "",
  summary: "",
  description: "",
  highlight_ids: [],
};

export default function NewListingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [highlights, setHighlights] = useState<ListingHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{ file: File; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(fullSchema) as Resolver<FormData>,
    defaultValues,
  });

  const { register, handleSubmit, setValue, watch, trigger, formState: { errors } } = form;

  useEffect(() => {
    Promise.all([getCategories(), getListingHighlights()]).then(([cats, hls]) => {
      setCategories(cats);
      setHighlights(hls);
      setLoading(false);
    });
  }, []);

  async function onStep1Next() {
    const ok = await trigger([
      "title", "category_id", "location_text", "state", "suburb", "postcode",
      "price_type", "asking_price", "revenue", "profit", "lease_details",
    ]);
    if (ok) setStep(2);
  }

  async function onStep2Next() {
    const ok = await trigger(["summary", "description"]);
    if (ok) setStep(3);
  }

  function onImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    setSelectedImages((prev) => {
      const next = [...prev];
      for (const file of files) {
        if (next.length >= MAX_IMAGES_PER_LISTING) break;
        if (!ACCEPT_IMAGES.includes(file.type)) continue;
        next.push({ file, url: URL.createObjectURL(file) });
      }
      return next.slice(0, MAX_IMAGES_PER_LISTING);
    });
  }

  function removeSelectedImage(index: number) {
    setSelectedImages((prev) => {
      const entry = prev[index];
      if (entry?.url) URL.revokeObjectURL(entry.url);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function onPublish(isDraft: boolean) {
    setSubmitting(true);
    const values = form.getValues();
    const result = await createListing({
      title: values.title,
      category_id: values.category_id,
      location_text: values.location_text || null,
      state: values.state || null,
      suburb: values.suburb || null,
      postcode: values.postcode || null,
      asking_price: values.asking_price ?? null,
      price_type: values.price_type,
      revenue: values.revenue ?? null,
      profit: values.profit ?? null,
      lease_details: values.lease_details || null,
      summary: values.summary || null,
      description: values.description || null,
      highlight_ids: values.highlight_ids ?? [],
      status: isDraft ? "draft" : "published",
    });
    if (!result.ok) {
      setSubmitting(false);
      toast.error(result.error ?? "Failed to save.");
      return;
    }
    const listingId = result.id;
    if (listingId && selectedImages.length > 0) {
      for (let i = 0; i < selectedImages.length; i++) {
        const formData = new FormData();
        formData.set("file", selectedImages[i].file);
        const up = await uploadListingImage(listingId, formData);
        if (!up.ok) {
          toast.error(up.error ?? "Some images could not be uploaded.");
          break;
        }
      }
    }
    setSubmitting(false);
    toast.success(isDraft ? "Draft saved." : "Listing published.");
    router.replace("/dashboard/listings");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-1/2" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const priceType = watch("price_type");

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
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">New listing</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-muted-foreground">Step {step} of 3</span>
            <div className="flex gap-1" aria-hidden>
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 w-8 rounded-full transition-colors ${
                    s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {/* Step 1: Basic info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic info</CardTitle>
              <CardDescription>Title, category, location and price details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" {...register("title")} placeholder="e.g. Profitable cafe in Sydney CBD" />
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
                  <Input id="state" {...register("state")} placeholder="NSW" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suburb">Suburb</Label>
                  <Input id="suburb" {...register("suburb")} placeholder="Sydney" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input id="postcode" {...register("postcode")} placeholder="2000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location_text">Location (free text)</Label>
                  <Input id="location_text" {...register("location_text")} placeholder="e.g. Sydney CBD" />
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
                  <Input id="asking_price" type="number" min={0} step={1000} {...register("asking_price")} />
                  {errors.asking_price && <p className="text-sm text-destructive">{errors.asking_price.message}</p>}
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
                <Input id="lease_details" {...register("lease_details")} placeholder="e.g. 5+5 year lease" />
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={onStep1Next}>
                  Next <HugeiconsIcon icon={ArrowRight01Icon} className="ml-2 size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Content */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>Summary, description and images (optional).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea id="summary" {...register("summary")} rows={3} placeholder="Short summary for listings list" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register("description")} rows={8} placeholder="Full description of the business" />
              </div>
              <div className="space-y-2">
                <Label>Images</Label>
                <p className="text-sm text-muted-foreground">
                  Up to {MAX_IMAGES_PER_LISTING} images (JPEG, PNG, WebP, GIF). You can select multiple at once.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_IMAGES}
                  multiple
                  className="sr-only"
                  aria-label="Select listing images"
                  onChange={onImageSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={selectedImages.length >= MAX_IMAGES_PER_LISTING}
                >
                  Select images
                  {selectedImages.length > 0 && (
                    <span className="ml-2 text-muted-foreground">({selectedImages.length}/{MAX_IMAGES_PER_LISTING})</span>
                  )}
                </Button>
                {selectedImages.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {selectedImages.map((entry, index) => (
                      <div key={entry.url} className="relative flex flex-col items-center gap-1">
                        <div className="relative h-20 w-28 overflow-hidden rounded-md border bg-muted">
                          <img
                            src={entry.url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label="Remove image"
                          onClick={() => removeSelectedImage(index)}
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-2 size-4" /> Back
                </Button>
                <Button type="button" onClick={onStep2Next}>
                  Next <HugeiconsIcon icon={ArrowRight01Icon} className="ml-2 size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Highlights & publish */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Highlights & publish</CardTitle>
              <CardDescription>
                Add highlight tags. Images can be added in Step 2 or changed later on the edit page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Highlights</Label>
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
              </div>
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={submitting}>
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-2 size-4" /> Back
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => onPublish(true)} disabled={submitting}>
                    Save draft
                  </Button>
                  <Button type="button" onClick={() => onPublish(false)} disabled={submitting}>
                    {submitting ? "Saving…" : "Publish"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
