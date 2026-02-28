import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProfileBySlug } from "@/lib/actions/profile";
import { getPublishedListingsByBrokerId } from "@/lib/actions/listings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Using lucide-react — swap to heroicons if preferred
import {
  Phone,
  Mail,
  Globe,
  Linkedin,
  Facebook,
  Instagram,
  MapPin,
  ArrowRight,
  Building2,
} from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);
  if (!profile) return { title: "Broker not found | Salebiz" };
  const title =
    [profile.name, profile.company]
      .filter(Boolean)
      .join(profile.company ? " · " : "") || "Broker";
  const description =
    profile.bio?.slice(0, 160) ?? `Broker profile on Salebiz`;
  return {
    title: `${title} | Salebiz`,
    description,
    openGraph: {
      title: `${title} | Salebiz`,
      description,
      ...(profile.photo_url && { images: [{ url: profile.photo_url }] }),
    },
  };
}

function formatPrice(listing: {
  price_type: string;
  asking_price: number | null;
}): string {
  if (listing.price_type === "poa") return "POA";
  if (listing.asking_price != null) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(Number(listing.asking_price));
  }
  return "—";
}

export default async function BrokerProfilePage({ params }: Props) {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);
  if (!profile) notFound();

  const listings = await getPublishedListingsByBrokerId(profile.id);
  const displayName = profile.name || profile.company || "Broker";
  const social = profile.social_links;
  const hasSocial = social?.linkedin || social?.facebook || social?.instagram;
  const hasContact = profile.phone || profile.email_public || profile.website;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-3xl flex h-14 sm:h-16 items-center justify-between gap-4 px-4">
          <Link
            href="/"
            className="flex items-center shrink-0 font-semibold text-foreground"
            aria-label="Salebiz home"
          >
            <Image
              src="/Salebizsvg.svg"
              alt="Salebiz"
              width={100}
              height={30}
              className="h-7 w-auto object-contain sm:h-8"
            />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Button variant="outline" size="sm" asChild>
              <Link href="/search">Browse listings</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12 space-y-6">

        {/* ── Hero card ── */}
        <Card className="overflow-hidden">
          {/* Subtle decorative top stripe */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

          <CardContent className="pt-8 pb-8 sm:pt-10 sm:pb-10">
            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">

              {/* Avatar */}
              <div className="shrink-0">
                {profile.photo_url ? (
                  <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden border-2 border-border bg-muted ring-4 ring-primary/10">
                    <Image
                      src={profile.photo_url}
                      alt={displayName}
                      fill
                      className="object-cover"
                      sizes="112px"
                      priority
                    />
                  </div>
                ) : (
                  <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full border-2 border-border bg-muted ring-4 ring-primary/10 text-2xl sm:text-3xl font-semibold text-muted-foreground">
                    {(profile.name?.trim() || profile.company?.trim() || "B")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name + company + CTA row */}
              <div className="flex-1 min-w-0 space-y-4">
                <div className="space-y-1.5">
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    {displayName}
                  </h1>

                  {profile.company && (
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      {profile.logo_url ? (
                        <span className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2.5 py-1">
                          <span className="relative inline-block h-5 w-5 shrink-0 overflow-hidden rounded-sm bg-background">
                            <Image
                              src={profile.logo_url}
                              alt=""
                              fill
                              className="object-contain p-0.5"
                              sizes="20px"
                            />
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {profile.company}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          {profile.company}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Listing count badge */}
                  {listings.length > 0 && (
                    <div className="flex justify-center sm:justify-start">
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {listings.length} active{" "}
                        {listings.length === 1 ? "listing" : "listings"}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Contact buttons */}
                {hasContact && (
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    {profile.phone && (
                      <Button asChild size="sm" className="gap-1.5">
                        <a href={`tel:${profile.phone.replace(/\s/g, "")}`}>
                          <Phone className="h-3.5 w-3.5" />
                          Call
                        </a>
                      </Button>
                    )}
                    {profile.email_public && (
                      <Button asChild variant="outline" size="sm" className="gap-1.5">
                        <a href={`mailto:${profile.email_public}`}>
                          <Mail className="h-3.5 w-3.5" />
                          Email
                        </a>
                      </Button>
                    )}
                    {profile.website && (
                      <Button asChild variant="outline" size="sm" className="gap-1.5">
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          Website
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── About ── */}
        {profile.bio && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                About
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <p className="text-sm sm:text-base text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {profile.bio}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Social links ── */}
        {hasSocial && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Connect
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 flex flex-wrap gap-2">
              {social?.linkedin && (
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a
                    href={social.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    LinkedIn
                  </a>
                </Button>
              )}
              {social?.facebook && (
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Facebook className="h-3.5 w-3.5" />
                    Facebook
                  </a>
                </Button>
              )}
              {social?.instagram && (
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Instagram className="h-3.5 w-3.5" />
                    Instagram
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Listings ── */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Listings
            </CardTitle>
            {listings.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {listings.length} {listings.length === 1 ? "result" : "results"}
              </span>
            )}
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {listings.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {listings.map((listing) => {
                  const thumb = listing.listing_images?.[0]?.url;
                  return (
                    <li key={listing.id}>
                      <Link
                        href={`/listing/${listing.slug}`}
                        className="group flex gap-4 rounded-xl border border-border bg-muted/20 p-4 transition-all hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {/* Thumbnail */}
                        {thumb ? (
                          <div className="relative h-[72px] w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                            <Image
                              src={thumb}
                              alt=""
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              sizes="96px"
                            />
                          </div>
                        ) : (
                          <div className="flex h-[72px] w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted">
                            <Building2 className="h-5 w-5 text-muted-foreground/40" />
                          </div>
                        )}

                        {/* Details */}
                        <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5 gap-1">
                          <p className="font-medium text-sm leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                            {listing.title}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            {listing.category && (
                              <span className="text-xs text-muted-foreground truncate">
                                {listing.category.name}
                              </span>
                            )}
                            <span className="text-sm font-semibold text-foreground shrink-0 ml-auto">
                              {formatPrice(listing)}
                            </span>
                          </div>
                          {/* Subtle "view" affordance */}
                          <span className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            View listing <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="py-10 flex flex-col items-center gap-2 text-center">
                <Building2 className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  No published listings yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-3xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Salebiz. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/search" className="hover:text-foreground transition-colors">
              Browse listings
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}