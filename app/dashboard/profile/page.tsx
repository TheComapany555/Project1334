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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200).optional().or(z.literal("")),
  company: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email_public: z.string().email("Use a valid email").optional().or(z.literal("")),
  website: z.string().url("Use a valid URL").optional().or(z.literal("")),
  bio: z.string().max(2000).optional(),
  slug: z.string().max(100).regex(/^[a-z0-9-]*$/, "Only lowercase letters, numbers and hyphens").optional().or(z.literal("")),
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
    getProfileForEdit().then((data) => {
      if (!mounted || !data) return;
      setValue("name", data.name ?? "");
      setValue("company", data.company ?? "");
      setValue("phone", data.phone ?? "");
      setValue("email_public", data.email_public ?? "");
      setValue("website", data.website ?? "");
      setValue("bio", data.bio ?? "");
      setValue("slug", data.slug ?? (data.name ? generateSlugFromName(data.name) : "") ?? "");
      const social = data.social_links;
      setValue("social_linkedin", social?.linkedin ?? "");
      setValue("social_facebook", social?.facebook ?? "");
      setValue("social_instagram", social?.instagram ?? "");
      setPhotoUrl(data.photo_url);
      setLogoUrl(data.logo_url);
    }).finally(() => setLoading(false));
    return () => { mounted = false; };
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

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <Card><CardContent className="pt-6">Loading…</CardContent></Card>
      </div>
    );
  }

  const currentSlug = watch("slug");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        {currentSlug?.trim() && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/broker/${encodeURIComponent(currentSlug.trim())}`} target="_blank" rel="noopener noreferrer">
              View public profile
            </Link>
          </Button>
        )}
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Photo & logo</CardTitle>
            <CardDescription>Profile photo and company logo (max 5MB, JPEG/PNG/WebP/GIF)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-8">
            <div className="space-y-2">
              <Label>Profile photo</Label>
              <div className="flex items-center gap-4">
                {photoUrl ? (
                  <div className="relative h-24 w-24 rounded-full overflow-hidden border border-border bg-muted">
                    <Image src={photoUrl} alt="Profile" fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-full border border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground text-sm">
                    No photo
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    id="photo-upload"
                    onChange={onPhotoChange}
                    disabled={photoUploading}
                  />
                  <Label htmlFor="photo-upload" className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>{photoUploading ? "Uploading…" : "Upload photo"}</span>
                    </Button>
                  </Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Company logo</Label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <div className="relative h-24 w-24 rounded-full overflow-hidden border border-border bg-muted">
                    <Image src={logoUrl} alt="Logo" fill className="object-contain p-1" unoptimized />
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-md border border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground text-sm">
                    No logo
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    className="hidden"
                    id="logo-upload"
                    onChange={onLogoChange}
                    disabled={logoUploading}
                  />
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>{logoUploading ? "Uploading…" : "Upload logo"}</span>
                    </Button>
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personal & company info</CardTitle>
            <CardDescription>This information appears on your public broker profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your name" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" placeholder="Company name" {...register("company")} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" placeholder="Phone number" {...register("phone")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_public">Public email</Label>
                <Input id="email_public" type="email" placeholder="Contact email" {...register("email_public")} />
                {errors.email_public && <p className="text-sm text-destructive">{errors.email_public.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" placeholder="https://..." {...register("website")} />
              {errors.website && <p className="text-sm text-destructive">{errors.website.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" placeholder="Short bio for your profile" rows={4} {...register("bio")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile URL</CardTitle>
            <CardDescription>Your public profile will be at /broker/[this-slug]. Auto-generated from name; you can edit it. Must be unique.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">/broker/</span>
              <Input
                placeholder="your-profile"
                {...register("slug")}
                className="font-mono max-w-xs"
              />
            </div>
            {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social links</CardTitle>
            <CardDescription>LinkedIn, Facebook, Instagram (optional).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="social_linkedin">LinkedIn</Label>
              <Input id="social_linkedin" type="url" placeholder="https://linkedin.com/in/..." {...register("social_linkedin")} />
              {errors.social_linkedin && <p className="text-sm text-destructive">{errors.social_linkedin.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="social_facebook">Facebook</Label>
              <Input id="social_facebook" type="url" placeholder="https://facebook.com/..." {...register("social_facebook")} />
              {errors.social_facebook && <p className="text-sm text-destructive">{errors.social_facebook.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="social_instagram">Instagram</Label>
              <Input id="social_instagram" type="url" placeholder="https://instagram.com/..." {...register("social_instagram")} />
              {errors.social_instagram && <p className="text-sm text-destructive">{errors.social_instagram.message}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save profile"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
