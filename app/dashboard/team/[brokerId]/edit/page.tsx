"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getBrokerProfileForOwner,
  updateBrokerProfile,
  uploadBrokerPhoto,
} from "@/lib/actions/agencies";
import { PageHeader } from "@/components/admin/page-header";
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
import { FieldError } from "@/components/ui/field-error";
import { AITextActions } from "@/components/ai/ai-text-actions";
import {
  User,
  Phone,
  Mail,
  Globe,
  FileText,
  Link2,
  Linkedin,
  Facebook,
  Instagram,
  Loader2,
  Camera,
  Save,
  ArrowLeft,
} from "lucide-react";

const schema = z.object({
  name: z.string().max(200).optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  email_public: z.string().email("Enter a valid email").optional().or(z.literal("")),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  bio: z.string().max(2000).optional(),
  slug: z
    .string()
    .max(100)
    .regex(/^[a-z0-9-]*$/, "Only lowercase letters, numbers and hyphens")
    .optional()
    .or(z.literal("")),
  social_linkedin: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  social_facebook: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  social_instagram: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export default function EditBrokerPage() {
  const { brokerId } = useParams<{ brokerId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [brokerEmail, setBrokerEmail] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    let mounted = true;
    getBrokerProfileForOwner(brokerId)
      .then((data) => {
        if (!mounted) return;
        if (!data) {
          setNotFound(true);
          return;
        }
        setValue("name", data.name ?? "");
        setValue("phone", data.phone ?? "");
        setValue("email_public", data.email_public ?? "");
        setValue("website", data.website ?? "");
        setValue("bio", data.bio ?? "");
        setValue("slug", data.slug ?? "");
        setValue("social_linkedin", data.social_links?.linkedin ?? "");
        setValue("social_facebook", data.social_links?.facebook ?? "");
        setValue("social_instagram", data.social_links?.instagram ?? "");
        setPhotoUrl(data.photo_url);
        setBrokerEmail(data.email);
      })
      .finally(() => setLoading(false));
    return () => { mounted = false; };
  }, [brokerId, setValue]);

  async function onSubmit(data: FormData) {
    const formData = new FormData();
    formData.set("name", data.name || "");
    formData.set("phone", data.phone || "");
    formData.set("email_public", data.email_public || "");
    formData.set("website", data.website || "");
    formData.set("bio", data.bio || "");
    formData.set("slug", (data.slug ?? "").trim());
    formData.set("social_linkedin", data.social_linkedin || "");
    formData.set("social_facebook", data.social_facebook || "");
    formData.set("social_instagram", data.social_instagram || "");
    const result = await updateBrokerProfile(brokerId, formData);
    if (result.ok) {
      toast.success("Broker profile updated.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update profile.");
    }
  }

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadBrokerPhoto(brokerId, formData);
    setPhotoUploading(false);
    if (result.ok && result.url) {
      setPhotoUrl(result.url);
      toast.success("Photo updated.");
    } else {
      toast.error(result.error ?? "Upload failed.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
        <Card><CardContent className="p-5 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-6">
        <PageHeader title="Broker not found" description="This broker doesn't exist or is not in your agency." />
        <Button variant="outline" onClick={() => router.push("/dashboard/team")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to team
        </Button>
      </div>
    );
  }

  const currentSlug = watch("slug");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit broker: ${watch("name") || brokerEmail}`}
        description={brokerEmail}
        backHref="/dashboard/team"
        backLabel="Back to team"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Photo */}
        <Card>
          <CardHeader className="border-b border-border bg-muted/40 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-primary/10 flex items-center justify-center shrink-0">
                <Camera className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Profile photo</CardTitle>
                <CardDescription className="text-xs mt-0.5">Max 5MB, JPEG/PNG/WebP/GIF</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-6">
            <div className="flex items-center gap-5">
              <div className="relative h-20 w-20 rounded-full border-2 border-border bg-muted overflow-hidden group shrink-0">
                {photoUrl ? (
                  <Image src={photoUrl} alt="Broker photo" fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Camera className="h-7 w-7 text-muted-foreground/30" />
                  </div>
                )}
                <label
                  htmlFor="photo-upload"
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
                >
                  <Camera className="h-5 w-5 text-white" />
                </label>
              </div>
              <div>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" id="photo-upload" onChange={onPhotoChange} disabled={photoUploading} />
                <label htmlFor="photo-upload">
                  <Button type="button" variant="outline" size="sm" className="cursor-pointer" disabled={photoUploading} asChild>
                    <span>{photoUploading ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Uploading…</> : "Change photo"}</span>
                  </Button>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal info */}
        <Card>
          <CardHeader className="border-b border-border bg-muted/40 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Personal info</CardTitle>
                <CardDescription className="text-xs mt-0.5">This information appears on the broker&apos;s public profile.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input id="name" placeholder="Full name" className={`pl-9 h-10 ${errors.name ? "border-destructive" : ""}`} {...register("name")} />
                </div>
                <FieldError message={errors.name?.message} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Login email</Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-muted/40">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">{brokerEmail}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input id="phone" type="tel" placeholder="Phone number" className="pl-9 h-10" {...register("phone")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email_public" className="text-sm font-medium">Public email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input id="email_public" type="email" placeholder="Contact email" className={`pl-9 h-10 ${errors.email_public ? "border-destructive" : ""}`} {...register("email_public")} />
                </div>
                <FieldError message={errors.email_public?.message} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website" className="text-sm font-medium">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input id="website" type="url" placeholder="https://website.com" className={`pl-9 h-10 ${errors.website ? "border-destructive" : ""}`} {...register("website")} />
              </div>
              <FieldError message={errors.website?.message} />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                <AITextActions
                  kind="broker_bio"
                  getCurrentText={() => getValues("bio") ?? ""}
                  getContext={() => ({
                    name: getValues("name") || undefined,
                    publicEmail: getValues("email_public") || undefined,
                    website: getValues("website") || undefined,
                  })}
                  onAccept={(text) =>
                    setValue("bio", text, { shouldDirty: true })
                  }
                />
              </div>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Textarea id="bio" placeholder="A short bio…" rows={4} className="pl-9 resize-none" {...register("bio")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile URL */}
        <Card>
          <CardHeader className="border-b border-border bg-muted/40 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-primary/10 flex items-center justify-center shrink-0">
                <Link2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Profile URL</CardTitle>
                <CardDescription className="text-xs mt-0.5">Public profile at /broker/[slug]</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-5 space-y-2">
            <Label className="text-sm font-medium">Slug</Label>
            <div className="flex items-center gap-0 rounded-md border border-border bg-muted/40 overflow-hidden focus-within:ring-2 focus-within:ring-ring">
              <span className="pl-3 pr-2 text-sm text-muted-foreground whitespace-nowrap select-none">/broker/</span>
              <Separator orientation="vertical" className="h-5" />
              <Input placeholder="profile-slug" className="border-0 bg-transparent font-mono text-sm focus-visible:ring-0 h-10 rounded-none" {...register("slug")} />
            </div>
            <FieldError message={errors.slug?.message} />
            {currentSlug?.trim() && (
              <p className="text-xs text-muted-foreground">
                Public URL: <span className="text-primary font-mono">/broker/{currentSlug.trim()}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Social links */}
        <Card>
          <CardHeader className="border-b border-border bg-muted/40 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Social links</CardTitle>
                <CardDescription className="text-xs mt-0.5">Optional social profiles.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="social_linkedin" className="text-sm font-medium flex items-center gap-1.5"><Linkedin className="h-3.5 w-3.5" /> LinkedIn</Label>
              <Input id="social_linkedin" type="url" placeholder="https://linkedin.com/in/..." className={`h-10 ${errors.social_linkedin ? "border-destructive" : ""}`} {...register("social_linkedin")} />
              <FieldError message={errors.social_linkedin?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="social_facebook" className="text-sm font-medium flex items-center gap-1.5"><Facebook className="h-3.5 w-3.5" /> Facebook</Label>
              <Input id="social_facebook" type="url" placeholder="https://facebook.com/..." className={`h-10 ${errors.social_facebook ? "border-destructive" : ""}`} {...register("social_facebook")} />
              <FieldError message={errors.social_facebook?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="social_instagram" className="text-sm font-medium flex items-center gap-1.5"><Instagram className="h-3.5 w-3.5" /> Instagram</Label>
              <Input id="social_instagram" type="url" placeholder="https://instagram.com/..." className={`h-10 ${errors.social_instagram ? "border-destructive" : ""}`} {...register("social_instagram")} />
              <FieldError message={errors.social_instagram?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1 pb-6">
          <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : <><Save className="mr-2 h-4 w-4" />Save profile</>}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/team")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
