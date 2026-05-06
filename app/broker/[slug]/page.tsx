import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth-client";
import { getProfileBySlug } from "@/lib/actions/profile";
import { getPublishedListingsByBrokerId } from "@/lib/actions/listings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PublicHeader } from "@/components/public-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { PublicProfileListingRow } from "@/components/shared/public-profile-listing-row";
import {
  Phone,
  Mail,
  Globe,
  Linkedin,
  Facebook,
  Instagram,
  Building2,
  ExternalLink,
} from "lucide-react";

export const revalidate = 600;

type Props = { params: Promise<{ slug: string }> };

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://salebiz.com.au";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);
  if (!profile) return { title: "Broker not found" };
  const agencyName = profile.agency?.name ?? profile.company;
  const title =
    [profile.name, agencyName].filter(Boolean).join(" · ") || "Broker";
  const description =
    profile.bio?.slice(0, 155) ??
    `${title}: Licensed business broker on Salebiz. View their listings and contact details.`;
  const url = `${SITE_URL}/broker/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      title,
      description,
      url,
      ...(profile.photo_url && {
        images: [{ url: profile.photo_url, alt: title }],
      }),
    },
    twitter: { card: "summary", title, description },
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
  const [session, profile] = await Promise.all([
    getSession(),
    getProfileBySlug(slug),
  ]);
  if (!profile) notFound();

  const listings = await getPublishedListingsByBrokerId(profile.id);
  const displayName = profile.name || profile.company || "Broker";
  const agencyName = profile.agency?.name ?? profile.company;
  const social = profile.social_links;
  const hasSocial = social?.linkedin || social?.facebook || social?.instagram;
  const hasContact = profile.phone || profile.email_public || profile.website;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex min-w-0 flex-col overflow-x-clip bg-background">
      <PublicHeader session={session} maxWidth="max-w-6xl" />

      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-8 sm:py-10">
        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "RealEstateAgent",
              name: displayName,
              url: `${SITE_URL}/broker/${profile.slug}`,
              ...(profile.photo_url && { image: profile.photo_url }),
              ...(profile.bio && { description: profile.bio.slice(0, 300) }),
              ...(agencyName && {
                worksFor: { "@type": "Organization", name: agencyName },
              }),
              ...(profile.phone && { telephone: profile.phone }),
              ...(profile.email_public && { email: profile.email_public }),
              ...(profile.website && { sameAs: [profile.website] }),
            }),
          }}
        />

        <div className="min-w-0 space-y-6">
          <PageBreadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Browse", href: "/search" },
              { label: displayName },
            ]}
          />

          {/* Two-column layout — minmax(0,…) lets the listings column shrink on small viewports */}
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            {/* Left: Profile sidebar */}
            <div className="min-w-0 space-y-4">
              <Card className="min-w-0">
                <CardContent className="pt-6 pb-6 flex min-w-0 flex-col items-center text-center gap-4">
                  <Avatar className="h-28 w-28 ring-4 ring-primary/10">
                    {profile.photo_url && (
                      <AvatarImage src={profile.photo_url} alt={displayName} />
                    )}
                    <AvatarFallback className="text-3xl font-semibold bg-primary/10 text-primary">
                      {initial}
                    </AvatarFallback>
                  </Avatar>

                  <div className="w-full min-w-0 space-y-1.5">
                    <h1 className="text-balance text-xl font-semibold tracking-tight break-words">
                      {displayName}
                    </h1>
                    {agencyName && (
                      <div className="flex min-w-0 items-center justify-center gap-1.5">
                        {profile.agency?.logo_url ? (
                          <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded">
                            <Image
                              src={profile.agency.logo_url}
                              alt=""
                              fill
                              className="object-contain"
                              sizes="24px"
                            />
                          </div>
                        ) : (
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        )}
                        {profile.agency?.slug ? (
                          <Link
                            href={`/agency/${profile.agency.slug}`}
                            className="min-w-0 text-sm text-muted-foreground break-words hover:text-foreground hover:underline"
                          >
                            {agencyName}
                          </Link>
                        ) : (
                          <span className="min-w-0 text-sm text-muted-foreground break-words">
                            {agencyName}
                          </span>
                        )}
                      </div>
                    )}
                    {listings.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {listings.length} active{" "}
                        {listings.length === 1 ? "listing" : "listings"}
                      </Badge>
                    )}
                  </div>

                  {hasContact && (
                    <>
                      <Separator />
                      <div className="flex w-full min-w-0 flex-col gap-2">
                        {profile.phone && (
                          <Button asChild className="w-full min-w-0 gap-2">
                            <a
                              className="flex min-w-0 items-center gap-2"
                              href={`tel:${profile.phone.replace(/\s/g, "")}`}
                            >
                              <Phone className="h-4 w-4 shrink-0" />
                              <span className="min-w-0 truncate">
                                {profile.phone}
                              </span>
                            </a>
                          </Button>
                        )}
                        {profile.email_public && (
                          <Button
                            asChild
                            variant="outline"
                            className="w-full min-w-0 gap-2"
                          >
                            <a
                              className="flex min-w-0 items-center gap-2"
                              href={`mailto:${profile.email_public}`}
                            >
                              <Mail className="h-4 w-4 shrink-0" />
                              <span className="min-w-0 truncate">
                                {profile.email_public}
                              </span>
                            </a>
                          </Button>
                        )}
                        {profile.website && (
                          <Button
                            asChild
                            variant="outline"
                            className="w-full min-w-0 gap-2"
                          >
                            <a
                              className="flex min-w-0 items-center gap-2"
                              href={profile.website}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Globe className="h-4 w-4 shrink-0" />
                              <span className="min-w-0 truncate">Website</span>
                              <ExternalLink className="h-3 w-3 ml-auto shrink-0 text-muted-foreground" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </>
                  )}

                  {hasSocial && (
                    <>
                      <Separator />
                      <div className="flex gap-2">
                        {social?.linkedin && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            asChild
                          >
                            <a
                              href={social.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="LinkedIn"
                            >
                              <Linkedin className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {social?.facebook && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            asChild
                          >
                            <a
                              href={social.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Facebook"
                            >
                              <Facebook className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {social?.instagram && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            asChild
                          >
                            <a
                              href={social.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Instagram"
                            >
                              <Instagram className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* About */}
              {profile.bio && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                      {profile.bio}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Listings */}
            <div className="min-w-0 space-y-4">
              <Card className="min-w-0">
                <CardHeader className="flex min-w-0 flex-row items-center justify-between gap-2 pb-2">
                  <div>
                    <CardTitle className="text-base">Listings</CardTitle>
                    <CardDescription>
                      {listings.length === 0
                        ? "No published listings yet"
                        : `${listings.length} active ${listings.length === 1 ? "listing" : "listings"}`}
                    </CardDescription>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="min-w-0 pt-4">
                  {listings.length > 0 ? (
                    <div className="grid min-w-0 gap-3">
                      {listings.map((listing) => {
                        const thumb = listing.listing_images?.[0]?.url;
                        const location =
                          listing.location_text ||
                          [listing.suburb, listing.state]
                            .filter(Boolean)
                            .join(", ");
                        return (
                          <PublicProfileListingRow
                            key={listing.id}
                            href={`/listing/${listing.slug}`}
                            title={listing.title}
                            imageUrl={thumb}
                            location={location || null}
                            categoryName={listing.category?.name ?? null}
                            priceLabel={formatPrice(listing)}
                          />
                        );
                      })}
                    </div>
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
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span suppressHydrationWarning>
            © {new Date().getFullYear()} Salebiz. All rights reserved.
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/search"
              className="hover:text-foreground transition-colors"
            >
              Browse listings
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
