"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Image from "next/image";
import type { SerializedEditorState } from "lexical";
import {
  createAd,
  updateAd,
  uploadAdImage,
} from "@/lib/actions/admin-advertising";
import type { Advertisement } from "@/lib/types/advertising";
import { Editor } from "@/components/blocks/editor-00/editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

const adSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(500).optional().or(z.literal("")),
  link_url: z.string().max(2000).optional().or(z.literal("")),
  placement: z.enum(["homepage", "search", "listing"]),
  sort_order: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof adSchema>;

function parseEditorState(
  json: string | null | undefined
): SerializedEditorState | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as SerializedEditorState;
  } catch {
    return undefined;
  }
}

function isEditorEmpty(state: SerializedEditorState | undefined): boolean {
  if (!state) return true;
  const root = state.root;
  if (!root?.children?.length) return true;
  if (
    root.children.length === 1 &&
    root.children[0].type === "paragraph" &&
    (!("children" in root.children[0]) ||
      (root.children[0] as { children?: unknown[] }).children?.length === 0)
  ) {
    return true;
  }
  return false;
}

export function AdvertisingForm({ ad }: { ad?: Advertisement }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!ad;

  // Editor state
  const [editorState, setEditorState] = useState<
    SerializedEditorState | undefined
  >(parseEditorState(ad?.html_content));

  // Image upload state
  const [imageUrl, setImageUrl] = useState<string>(ad?.image_url ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Date state managed outside react-hook-form
  const [startDate, setStartDate] = useState<Date | undefined>(
    ad?.start_date ? new Date(ad.start_date) : new Date()
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    ad?.end_date ? new Date(ad.end_date) : undefined
  );
  const [dateError, setDateError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      title: ad?.title ?? "",
      description: ad?.description ?? "",
      link_url: ad?.link_url ?? "",
      placement: ad?.placement ?? "homepage",
      sort_order: ad ? String(ad.sort_order) : "0",
    },
  });

  const placement = watch("placement");

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadAdImage(formData);
      if (res.ok && res.url) {
        setImageUrl(res.url);
        toast.success("Image uploaded");
      } else {
        toast.error(res.error ?? "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onSubmit(values: FormValues) {
    if (!startDate) {
      setDateError("Start date is required");
      return;
    }
    setDateError("");

    setIsSubmitting(true);
    try {
      const sortOrder = values.sort_order
        ? parseInt(values.sort_order, 10)
        : 0;
      const startDateIso = startDate.toISOString();
      const endDateIso = endDate
        ? new Date(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate(),
            23,
            59,
            59
          ).toISOString()
        : null;

      const richContent =
        editorState && !isEditorEmpty(editorState)
          ? JSON.stringify(editorState)
          : null;

      if (isEdit && ad) {
        const res = await updateAd(ad.id, {
          title: values.title,
          description: values.description || null,
          image_url: imageUrl || null,
          html_content: richContent,
          link_url: values.link_url || null,
          placement: values.placement,
          start_date: startDateIso,
          end_date: endDateIso,
          sort_order: sortOrder,
        });
        if (res.ok) {
          toast.success("Ad updated");
          router.refresh();
          router.push("/admin/advertising");
        } else {
          toast.error(res.error ?? "Failed to update");
        }
      } else {
        const res = await createAd({
          title: values.title,
          description: values.description || null,
          image_url: imageUrl || null,
          html_content: richContent,
          link_url: values.link_url || null,
          placement: values.placement,
          start_date: startDateIso,
          end_date: endDateIso,
          sort_order: sortOrder,
        });
        if (res.ok) {
          toast.success("Ad created");
          router.refresh();
          router.push("/admin/advertising");
        } else {
          toast.error(res.error ?? "Failed to create");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          {...register("title")}
          placeholder="e.g. Spring Business Sale Promotion"
        />
        <FieldError message={errors.title?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Short description (optional)"
          rows={2}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="placement">Placement</Label>
        <Select
          value={placement}
          onValueChange={(val) =>
            setValue("placement", val as "homepage" | "search" | "listing")
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select placement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="homepage">Homepage</SelectItem>
            <SelectItem value="search">Search results</SelectItem>
            <SelectItem value="listing">Listing page</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Where this ad will be displayed on the site.
        </p>
      </div>

      {/* Image upload */}
      <div className="space-y-2">
        <Label>Ad image</Label>
        {imageUrl ? (
          <div className="relative rounded-lg border border-border overflow-hidden bg-muted">
            <div className="relative aspect-[4/1] sm:aspect-[5/1] w-full">
              <Image
                src={imageUrl}
                alt="Ad preview"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 672px"
              />
            </div>
            <div className="absolute top-2 right-2 flex gap-1.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 text-xs shadow-sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ImagePlus className="h-3 w-3" />
                )}
                Replace
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-7 gap-1 text-xs shadow-sm"
                onClick={() => setImageUrl("")}
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 py-10 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <ImagePlus className="h-8 w-8" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium">
                {isUploading ? "Uploading…" : "Click to upload an image"}
              </p>
              <p className="text-xs">
                JPEG, PNG, WebP, GIF — max 5 MB
              </p>
            </div>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleImageUpload}
        />
        <p className="text-xs text-muted-foreground">
          Upload a banner image. Leave empty to use rich text content instead.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Rich text content (optional)</Label>
        <Editor
          editorSerializedState={editorState}
          onSerializedChange={(value) => setEditorState(value)}
        />
        <p className="text-xs text-muted-foreground">
          Rich text content for the ad. Used when no image is provided.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="link_url">Click-through URL</Label>
        <Input
          id="link_url"
          {...register("link_url")}
          placeholder="https://example.com/landing-page"
        />
        <p className="text-xs text-muted-foreground">
          Where users go when they click the ad. Leave empty for non-clickable
          ads.
        </p>
        <FieldError message={errors.link_url?.message} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start date</Label>
          <DatePicker
            value={startDate}
            onChange={(date) => {
              setStartDate(date);
              if (date) setDateError("");
            }}
            placeholder="Select start date"
          />
          <FieldError message={dateError} />
        </div>
        <div className="space-y-2">
          <Label>End date (optional)</Label>
          <DatePicker
            value={endDate}
            onChange={setEndDate}
            placeholder="No expiry"
            clearable
          />
          <p className="text-xs text-muted-foreground">
            Leave empty for no expiry.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sort_order">Sort order</Label>
        <Input
          id="sort_order"
          type="number"
          min="0"
          {...register("sort_order")}
          placeholder="0"
        />
        <p className="text-xs text-muted-foreground">
          Lower numbers appear first. Default is 0.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="gap-1.5">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save changes" : "Create ad"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/advertising")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
