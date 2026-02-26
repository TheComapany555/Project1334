"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getProfileForEdit,
  updateProfile,
  uploadProfilePhoto,
  uploadProfileLogo,
  type ProfileFormData,
} from "@/lib/actions/profile";
import { generateSlugFromName } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Building2,
  Phone,
  Mail,
  Globe,
  FileText,
  Link2,
  Linkedin,
  Facebook,
  Instagram,
  ExternalLink,
  Loader2,
  Camera,
  AlertCircle,
  Save,
} from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200).optional().or(z.literal("")),
  company: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email_public: z.string().email("Use a valid email").optional().or(z.literal("")),
  website: z.string().url("Use a valid URL").optional().or(z.literal("")),
  bio: z.string().max(2000).optional(),
  slug: z
    .string()
    .max(100)
    .regex(/^[a-z0-9-]*$/, "Only lowercase letters, numbers and hyphens")
    .optional()
    .or(z.literal("")),
  social_linkedin: z.string().url().optional().or(z.literal("")),
  social_facebook: z.string().url().optional().or(z.literal("")),
  social_instagram: z.string().url().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

const emptyForm: FormData = {
  name: "",
  company: "",
  phone: "",
  email_public: "",
  website: "",
  bio: "",
  slug: "",
  social_linkedin: "",
  social_facebook: "",
  social_instagram: "",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <CardHeader className="border-b border-border/60 bg-muted/30 px-5 py-4">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-[#1a5c38]/10 dark:bg-[#1a5c38]/20 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-[#1a5c38] dark:text-[#4ade80]" />
        </div>
        <div>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
  );
}

function ImageUploadSlot({
  id,
  label,
  url,
  uploading,
  onChange,
  accept,
  shape = "circle",
}: {
  id: string;
  label: string;
  url: string | null;
  uploading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accept: string;
  shape?: "circle" | "square";
}) {
  const radius = shape === "circle" ? "rounded-full" : "rounded-lg";
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative h-24 w-24 ${radius} border-2 border-border bg-muted overflow-hidden group`}>
        {url ? (
          <Image
            src={url}
            alt={label}
            fill
            className={shape === "circle" ? "object-cover" : "object-contain p-2"}
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Camera className="h-7 w-7 text-muted-foreground/30" />
          </div>
        )}
        {/* Hover overlay */}
        <label
          htmlFor={id}
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[inherit]"
        >
          <Camera className="h-5 w-5 text-white" />
        </label>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <input
          type="file"
          accept={accept}
          className="hidden"
          id={id}
          onChange={onChange}
          disabled={uploading}
        />
        <label htmlFor={id}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1.5 h-7 text-xs cursor-pointer"
            disabled={uploading}
            asChild
          >
            <span>
              {uploading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  Uploading…
                </>
              ) : (
                "Change"
              )}
            </span>
          </Button>
        </label>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: emptyForm,
  });

  useEffect(() => {
    let mounted = true;
    getProfileForEdit()
      .then((data) => {
        if (!mounted || !data) return;
        setValue("name", data.name ?? "");
        setValue("company", data.company ?? "");
        setValue("phone", data.phone ?? "");
        setValue("email_public", data.email_public ?? "");
        setValue("website", data.website ?? "");
        setValue("bio", data.bio ?? "");
        setValue(
          "slug",
          data.slug ?? (data.name ? generateSlugFromName(data.name) : "") ?? ""
        );
        const social = data.social_links;
        setValue("social_linkedin", social?.linkedin ?? "");
        setValue("social_facebook", social?.facebook ?? "");
        setValue("social_instagram", social?.instagram ?? "");
        setPhotoUrl(data.photo_url);
        setLogoUrl(data.logo_url);
      })
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [setValue]);

  async function onSubmit(data: FormData) {
    const formData = new FormData();
    formData.set("name", data.name || "");
    formData.set("company", data.company || "");
    formData.set("phone", data.phone || "");
    formData.set("email_public", data.email_public || "");
    formData.set("website", data.website || "");
    formData.set("bio", data.bio || "");
    formData.set("slug", (data.slug ?? "").trim());
    formData.set("social_linkedin", data.social_linkedin || "");
    formData.set("social_facebook", data.social_facebook || "");
    formData.set("social_instagram", data.social_instagram || "");
    const result = await updateProfile(formData);
    if (result.ok) {
      toast.success("Profile updated.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadProfilePhoto(formData);
    setPhotoUploading(false);
    if (result.ok && result.url) {
      setPhotoUrl(result.url + "?t=" + Date.now());
      toast.success("Photo updated.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Upload failed.");
    }
  }

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadProfileLogo(formData);
    setLogoUploading(false);
    if (result.ok && result.url) {
      setLogoUrl(result.url + "?t=" + Date.now());
      toast.success("Logo updated.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Upload failed.");
    }
  }

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const currentSlug = watch("slug");

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your public broker profile and contact information.
          </p>
        </div>
        {currentSlug?.trim() && (
          <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
            <Link
              href={`/broker/${encodeURIComponent(currentSlug.trim())}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View public profile
            </Link>
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* ── Photo & logo ── */}
        <Card className="shadow-sm">
          <SectionHeader
            icon={Camera}
            title="Photo & logo"
            description="Profile photo and company logo (max 5MB, JPEG/PNG/WebP/GIF)"
          />
          <CardContent className="px-5 py-6">
            <div className="flex flex-wrap gap-10">
              <ImageUploadSlot
                id="photo-upload"
                label="Profile photo"
                url={photoUrl}
                uploading={photoUploading}
                onChange={onPhotoChange}
                accept="image/jpeg,image/png,image/webp,image/gif"
                shape="circle"
              />
              <ImageUploadSlot
                id="logo-upload"
                label="Company logo"
                url={logoUrl}
                uploading={logoUploading}
                onChange={onLogoChange}
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                shape="circle"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Personal & company info ── */}
        <Card className="shadow-sm">
          <SectionHeader
            icon={User}
            title="Personal & company info"
            description="This information appears on your public broker profile."
          />
          <CardContent className="px-5 py-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">
                  Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="name"
                    placeholder="Your full name"
                    className={`pl-9 h-10 ${errors.name ? "border-destructive" : ""}`}
                    {...register("name")}
                  />
                </div>
                <FieldError message={errors.name?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company" className="text-sm font-medium">
                  Company
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="company"
                    placeholder="Company name"
                    className="pl-9 h-10"
                    {...register("company")}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Phone number"
                    className="pl-9 h-10"
                    {...register("phone")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email_public" className="text-sm font-medium">
                  Public email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email_public"
                    type="email"
                    placeholder="Contact email"
                    className={`pl-9 h-10 ${errors.email_public ? "border-destructive" : ""}`}
                    {...register("email_public")}
                  />
                </div>
                <FieldError message={errors.email_public?.message} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website" className="text-sm font-medium">
                Website
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourwebsite.com"
                  className={`pl-9 h-10 ${errors.website ? "border-destructive" : ""}`}
                  {...register("website")}
                />
              </div>
              <FieldError message={errors.website?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-sm font-medium">
                Bio
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Textarea
                  id="bio"
                  placeholder="A short bio for your public profile…"
                  rows={4}
                  className="pl-9 resize-none"
                  {...register("bio")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Profile URL ── */}
        <Card className="shadow-sm">
          <SectionHeader
            icon={Link2}
            title="Profile URL"
            description="Your public profile will be at /broker/[this-slug]. Auto-generated from name; must be unique."
          />
          <CardContent className="px-5 py-5 space-y-2">
            <Label className="text-sm font-medium">Slug</Label>
            <div className="flex items-center gap-0 rounded-md border border-border bg-muted/40 overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
              <span className="pl-3 pr-2 text-sm text-muted-foreground whitespace-nowrap select-none">
                /broker/
              </span>
              <Separator orientation="vertical" className="h-5" />
              <Input
                placeholder="your-profile-slug"
                className="border-0 bg-transparent font-mono text-sm focus-visible:ring-0 h-10 rounded-none"
                {...register("slug")}
              />
            </div>
            <FieldError message={errors.slug?.message} />
            {currentSlug?.trim() && (
              <p className="text-xs text-muted-foreground">
                Public URL:{" "}
                <Link
                  href={`/broker/${encodeURIComponent(currentSlug.trim())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1a5c38] dark:text-[#4ade80] hover:underline font-mono"
                >
                  /broker/{currentSlug.trim()}
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Social links ── */}
        <Card className="shadow-sm">
          <SectionHeader
            icon={Globe}
            title="Social links"
            description="Add your LinkedIn, Facebook, and Instagram profiles (optional)."
          />
          <CardContent className="px-5 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="social_linkedin" className="text-sm font-medium flex items-center gap-1.5">
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </Label>
              <Input
                id="social_linkedin"
                type="url"
                placeholder="https://linkedin.com/in/yourprofile"
                className={`h-10 ${errors.social_linkedin ? "border-destructive" : ""}`}
                {...register("social_linkedin")}
              />
              <FieldError message={errors.social_linkedin?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="social_facebook" className="text-sm font-medium flex items-center gap-1.5">
                <Facebook className="h-3.5 w-3.5" /> Facebook
              </Label>
              <Input
                id="social_facebook"
                type="url"
                placeholder="https://facebook.com/yourpage"
                className={`h-10 ${errors.social_facebook ? "border-destructive" : ""}`}
                {...register("social_facebook")}
              />
              <FieldError message={errors.social_facebook?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="social_instagram" className="text-sm font-medium flex items-center gap-1.5">
                <Instagram className="h-3.5 w-3.5" /> Instagram
              </Label>
              <Input
                id="social_instagram"
                type="url"
                placeholder="https://instagram.com/yourhandle"
                className={`h-10 ${errors.social_instagram ? "border-destructive" : ""}`}
                {...register("social_instagram")}
              />
              <FieldError message={errors.social_instagram?.message} />
            </div>
          </CardContent>
        </Card>

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 pt-1 pb-6">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#1a5c38] hover:bg-[#144a2d] text-white shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save profile
              </>
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}