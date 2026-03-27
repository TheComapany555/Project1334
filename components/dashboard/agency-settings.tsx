"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getMyAgency,
  updateAgency,
  uploadAgencyLogo,
} from "@/lib/actions/agencies";
import { getMySubscription } from "@/lib/actions/subscriptions";
import type { AgencySubscription } from "@/lib/types/subscriptions";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
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
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { FieldError } from "@/components/ui/field-error";

const schema = z.object({
  name: z.string().min(1, "Agency name is required").max(200),
  slug: z
    .string()
    .max(100)
    .regex(/^[a-z0-9-]*$/, "Only lowercase letters, numbers and hyphens")
    .optional()
    .or(z.literal("")),
  phone: z.string().max(50).optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  bio: z.string().max(2000).optional(),
  social_linkedin: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  social_facebook: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  social_instagram: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

const emptyForm: FormData = {
  name: "",
  slug: "",
  phone: "",
  email: "",
  website: "",
  bio: "",
  social_linkedin: "",
  social_facebook: "",
  social_instagram: "",
};

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
    <CardHeader className="border-b border-border bg-muted/40 px-5 py-4">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            {description}
          </CardDescription>
        </div>
      </div>
    </CardHeader>
  );
}

export function AgencySettings({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [subscription, setSubscription] = useState<AgencySubscription | null>(null);

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
    Promise.all([getMyAgency(), getMySubscription()])
      .then(([agency, sub]) => {
        if (!mounted) return;
        if (agency) {
          setValue("name", agency.name ?? "");
          setValue("slug", agency.slug ?? "");
          setValue("phone", agency.phone ?? "");
          setValue("email", agency.email ?? "");
          setValue("website", agency.website ?? "");
          setValue("bio", agency.bio ?? "");
          const social = agency.social_links;
          setValue("social_linkedin", social?.linkedin ?? "");
          setValue("social_facebook", social?.facebook ?? "");
          setValue("social_instagram", social?.instagram ?? "");
          setLogoUrl(agency.logo_url);
        }
        setSubscription(sub);
      })
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [setValue]);

  async function onSubmit(data: FormData) {
    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("slug", (data.slug ?? "").trim());
    formData.set("phone", data.phone || "");
    formData.set("email", data.email || "");
    formData.set("website", data.website || "");
    formData.set("bio", data.bio || "");
    formData.set("social_linkedin", data.social_linkedin || "");
    formData.set("social_facebook", data.social_facebook || "");
    formData.set("social_instagram", data.social_instagram || "");
    const result = await updateAgency(formData);
    if (result.ok) {
      toast.success("Agency updated.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadAgencyLogo(formData);
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
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
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
    <div className="space-y-6">
      {!embedded && (
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Agency</h1>
          <p className="text-sm text-muted-foreground">
            Manage your agency profile. This information is shared across all
            brokers in your agency.
          </p>
        </div>
      )}

      {/* Subscription status */}
      <Card>
        <SectionHeader
          icon={CreditCard}
          title="Subscription"
          description={subscription ? "Your current subscription plan." : "Subscribe to start listing businesses."}
        />
        <CardContent className="px-5 py-5">
          {subscription && ["active", "trialing", "past_due"].includes(subscription.status) ? (
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {subscription.plan_product_id ? "Agency Monthly Subscription" : "Manual plan"}
                  </p>
                  <Badge
                    variant={subscription.status === "active" || subscription.status === "trialing" ? "success" : "warning"}
                    className="capitalize text-[10px]"
                  >
                    {subscription.status === "past_due" ? "Past due" : subscription.status}
                  </Badge>
                </div>
                {subscription.current_period_end && (
                  <p className="text-xs text-muted-foreground">
                    {subscription.status === "active" ? "Renews" : "Ends"} {format(new Date(subscription.current_period_end), "d MMM yyyy")}
                  </p>
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
                <Link href="/dashboard/subscribe">
                  Manage
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {subscription?.status === "pending"
                  ? "Your subscription is pending approval."
                  : "No active subscription. Subscribe to access all features."}
              </p>
              <Button asChild size="sm" className="shrink-0 gap-1.5">
                <Link href="/dashboard/subscribe">
                  {subscription?.status === "pending" ? "View status" : "Subscribe"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Logo */}
        <Card>
          <SectionHeader
            icon={Camera}
            title="Agency logo"
            description="Your agency logo (max 5MB, JPEG/PNG/WebP/GIF/SVG)"
          />
          <CardContent className="px-5 py-6">
            <div className="flex items-center gap-5">
              <div className="relative h-20 w-20 border-2 border-border bg-muted overflow-hidden group shrink-0">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="Agency logo"
                    fill
                    className="object-contain p-2"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Building2 className="h-7 w-7 text-muted-foreground/30" />
                  </div>
                )}
                <label
                  htmlFor="logo-upload"
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[inherit]"
                >
                  <Camera className="h-5 w-5 text-white" />
                </label>
              </div>
              <div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  id="logo-upload"
                  onChange={onLogoChange}
                  disabled={logoUploading}
                />
                <label htmlFor="logo-upload">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    disabled={logoUploading}
                    asChild
                  >
                    <span>
                      {logoUploading ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        "Change logo"
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agency info */}
        <Card>
          <SectionHeader
            icon={Building2}
            title="Agency details"
            description="Name, contact information and bio for your agency."
          />
          <CardContent className="px-5 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">
                Agency name
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="name"
                  placeholder="Your agency name"
                  className={`pl-9 h-10 ${errors.name ? "border-destructive" : ""}`}
                  {...register("name")}
                />
              </div>
              <FieldError message={errors.name?.message} />
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
                    placeholder="Agency phone"
                    className="pl-9 h-10"
                    {...register("phone")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Agency email"
                    className={`pl-9 h-10 ${errors.email ? "border-destructive" : ""}`}
                    {...register("email")}
                  />
                </div>
                <FieldError message={errors.email?.message} />
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
                  placeholder="https://youragency.com"
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
                  placeholder="A short description of your agency…"
                  rows={4}
                  className="pl-9 resize-none"
                  {...register("bio")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agency URL */}
        <Card>
          <SectionHeader
            icon={Link2}
            title="Agency URL"
            description="Your agency's public URL slug. Must be unique."
          />
          <CardContent className="px-5 py-5 space-y-2">
            <Label className="text-sm font-medium">Slug</Label>
            <div className="flex items-center gap-0 rounded-md border border-border bg-muted/40 overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
              <span className="pl-3 pr-2 text-sm text-muted-foreground whitespace-nowrap select-none">
                /agency/
              </span>
              <Separator orientation="vertical" className="h-5" />
              <Input
                placeholder="your-agency-slug"
                className="border-0 bg-transparent font-mono text-sm focus-visible:ring-0 h-10 rounded-none"
                {...register("slug")}
              />
            </div>
            <FieldError message={errors.slug?.message} />
          </CardContent>
        </Card>

        {/* Social links */}
        <Card>
          <SectionHeader
            icon={Globe}
            title="Social links"
            description="Add your agency's social profiles (optional)."
          />
          <CardContent className="px-5 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="social_linkedin"
                className="text-sm font-medium flex items-center gap-1.5"
              >
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </Label>
              <Input
                id="social_linkedin"
                type="url"
                placeholder="https://linkedin.com/company/youragency"
                className={`h-10 ${errors.social_linkedin ? "border-destructive" : ""}`}
                {...register("social_linkedin")}
              />
              <FieldError message={errors.social_linkedin?.message} />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="social_facebook"
                className="text-sm font-medium flex items-center gap-1.5"
              >
                <Facebook className="h-3.5 w-3.5" /> Facebook
              </Label>
              <Input
                id="social_facebook"
                type="url"
                placeholder="https://facebook.com/youragency"
                className={`h-10 ${errors.social_facebook ? "border-destructive" : ""}`}
                {...register("social_facebook")}
              />
              <FieldError message={errors.social_facebook?.message} />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="social_instagram"
                className="text-sm font-medium flex items-center gap-1.5"
              >
                <Instagram className="h-3.5 w-3.5" /> Instagram
              </Label>
              <Input
                id="social_instagram"
                type="url"
                placeholder="https://instagram.com/youragency"
                className={`h-10 ${errors.social_instagram ? "border-destructive" : ""}`}
                {...register("social_instagram")}
              />
              <FieldError message={errors.social_instagram?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1 pb-6">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save agency
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
