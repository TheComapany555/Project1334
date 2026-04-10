import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth-client";
import { getAgencyBySlug } from "@/lib/actions/agencies";
import { getPublishedListingsByAgencyId } from "@/lib/actions/listings";
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
  ExternalLink,
} from "lucide-react";

export const revalidate = 600;

type Props = { params: Promise<{ slug: string }> };

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://salebiz.com.au";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const agency = await getAgencyBySlug(slug);
  if (!agency) return { title: "Agency not found" };
  const title = agency.name;
  const description =
    agency.bio?.slice(0, 155) ??
    `${agency.name}: View active business listings and contact details on Salebiz.`;
  const url = `${SITE_URL}/agency/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      ...(agency.logo_url && { images: [{ url: agency.logo_url, alt: title }] }),
    },
    twitter: { card: "summary", title, description },
  };
}

function formatPrice(listing: { price_type: string; asking_price: number | null }): string {
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

export default async function AgencyPublicPage({ params }: Props) {
  const { slug } = await params;
  const [session, agency] = await Promise.all([getSession(), getAgencyBySlug(slug)]);
  if (!agency) notFound();

  const listings = await getPublishedListingsByAgencyId(agency.id);
  const social = agency.social_links;
  const hasSocial = social?.linkedin || social?.facebook || social?.instagram;
  const hasContact = agency.phone || agency.email || agency.website;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader session={session} maxWidth="max-w-6xl" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "RealEstateAgent",
              name: agency.name,
              url: `${SITE_URL}/agency/${slug}`,
              ...(agency.logo_url && { image: agency.logo_url }),
              ...(agency.bio && { description: agency.bio.slice(0, 300) }),
              ...(agency.phone && { telephone: agency.phone }),
              ...(agency.email && { email: agency.email }),
              ...(agency.website && { sameAs: [agency.website] }),
            }),
          }}
        />

        <div className="space-y-6">
          <PageBreadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Browse", href: "/search" },
              { label: agency.name },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6 pb-6 flex flex-col items-center text-center gap-4">
                  {agency.logo_url ? (
                    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                      <Image
                        src={agency.logo_url}
                        alt={agency.name}
                        fill
                        className="object-contain p-1"
                        sizes="112px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border border-border bg-primary/10">
                      <Building2 className="h-12 w-12 text-primary" />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <h1 className="text-xl font-semibold tracking-tight">{agency.name}</h1>
                    {listings.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {listings.length} active {listings.length === 1 ? "listing" : "listings"}
                      </Badge>
                    )}
                  </div>

                  {hasContact && (
                    <>
                      <Separator />
                      <div className="flex flex-col gap-2 w-full">
                        {agency.phone && (
                          <Button asChild className="w-full gap-2">
                            <a href={`tel:${agency.phone.replace(/\s/g, "")}`}>
                              <Phone className="h-4 w-4" />
                              {agency.phone}
                            </a>
                          </Button>
                        )}
                        {agency.email && (
                          <Button asChild variant="outline" className="w-full gap-2">
                            <a href={`mailto:${agency.email}`}>
                              <Mail className="h-4 w-4" />
                              {agency.email}
                            </a>
                          </Button>
                        )}
                        {agency.website && (
                          <Button asChild variant="outline" className="w-full gap-2">
                            <a href={agency.website} target="_blank" rel="noopener noreferrer">
                              <Globe className="h-4 w-4" />
                              Website
                              <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
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
                          <Button variant="outline" size="icon" className="h-9 w-9" asChild>
                            <a href={social.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                              <Linkedin className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {social?.facebook && (
                          <Button variant="outline" size="icon" className="h-9 w-9" asChild>
                            <a href={social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                              <Facebook className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {social?.instagram && (
                          <Button variant="outline" size="icon" className="h-9 w-9" asChild>
                            <a href={social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                              <Instagram className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {agency.bio && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{agency.bio}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
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
                <CardContent className="pt-4">
                  {listings.length > 0 ? (
                    <div className="grid gap-3">
                      {listings.map((listing) => {
                        const thumb = listing.listing_images?.[0]?.url;
                        const location =
                          listing.location_text || [listing.suburb, listing.state].filter(Boolean).join(", ");
                        return (
                          <Link
                            key={listing.id}
                            href={`/listing/${listing.slug}`}
                            className="group flex gap-4 rounded-lg border border-border p-3 transition-all hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm"
                          >
                            {thumb ? (
                              <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                                <Image
                                  src={thumb}
                                  alt={listing.title}
                                  fill
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                  sizes="112px"
                                />
                              </div>
                            ) : (
                              <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted">
                                <Building2 className="h-5 w-5 text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1 flex flex-col justify-between gap-1">
                              <div>
                                <p className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                  {listing.title}
                                </p>
                                {location && (
                                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {location}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                {listing.category && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {listing.category.name}
                                  </Badge>
                                )}
                                <span className="text-sm font-semibold text-foreground shrink-0 ml-auto">
                                  {formatPrice(listing)}
                                </span>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-10 flex flex-col items-center gap-2 text-center">
                      <Building2 className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No published listings yet.</p>
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
          <span suppressHydrationWarning>© {new Date().getFullYear()} Salebiz. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/search" className="hover:text-foreground transition-colors">
              Browse listings
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
