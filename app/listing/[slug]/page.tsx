import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getListingBySlug } from "@/lib/actions/listings";
import { getListingBySlugAdmin } from "@/lib/actions/admin-listings";
import { getSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { PublicHeader } from "@/components/public-header";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, TrendingUp, BarChart3, FileText, Sparkles, PhoneCall, Star } from "lucide-react";
import { FeaturedBadge, isFeaturedNow } from "@/components/listings/featured-badge";
import { EnquiryForm } from "./enquiry-form";
import { LocationMap } from "@/components/location-map";
import { AdSlot } from "@/components/ads/ad-slot";
import { DescriptionRenderer } from "@/components/listings/description-renderer";

// Revalidate listing pages every 10 minutes
export const revalidate = 600;

type Props = { params: Promise<{ slug: string }> };

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://salebiz.com.au";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) {
    return { title: "Listing not found" };
  }
  const location = listing.location_text || [listing.suburb, listing.state].filter(Boolean).join(", ");
  const title = listing.title;
  const description =
    listing.summary?.slice(0, 155) ??
    `${listing.title}${location ? ` in ${location}` : ""} — View details on Salebiz`;
  const image = listing.listing_images?.[0]?.url;
  const url = `${SITE_URL}/listing/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: title }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}

function formatPrice(listing: { price_type: string; asking_price: number | null }): string {
  if (listing.price_type === "poa") return "Price on application";
  if (listing.asking_price != null) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(Number(listing.asking_price));
  }
  return "";
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;

  // Try public view first; if not found, try admin view (no status filter)
  const session = await getSession();
  let listing = await getListingBySlug(slug);
  let isAdminPreview = false;
  if (!listing) {
    if (session?.user?.role === "admin") {
      listing = await getListingBySlugAdmin(slug) as typeof listing;
      isAdminPreview = !!listing;
    }
  }
  if (!listing) notFound();

  const broker = listing.broker;
  const images = listing.listing_images ?? [];
  const highlights = listing.listing_highlights ?? [];
  const locationText = listing.location_text || [listing.suburb, listing.state].filter(Boolean).join(", ") || "";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader session={session} maxWidth="max-w-6xl" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10 space-y-6">

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: listing.title,
              description: listing.summary ?? listing.title,
              url: `${SITE_URL}/listing/${listing.slug}`,
              ...(images.length > 0 && { image: images.map((img) => img.url) }),
              ...(listing.category && { category: listing.category.name }),
              offers: {
                "@type": "Offer",
                priceCurrency: "AUD",
                ...(listing.price_type !== "poa" && listing.asking_price != null
                  ? { price: Number(listing.asking_price) }
                  : { price: 0, priceValidUntil: undefined }),
                availability: "https://schema.org/InStock",
                url: `${SITE_URL}/listing/${listing.slug}`,
              },
              ...(broker?.name && {
                seller: {
                  "@type": "Person",
                  name: broker.name,
                  ...(broker.slug && { url: `${SITE_URL}/broker/${broker.slug}` }),
                },
              }),
              ...(locationText && {
                areaServed: {
                  "@type": "Place",
                  name: locationText,
                },
              }),
            }),
          }}
        />

        {/* BreadcrumbList structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
                { "@type": "ListItem", position: 2, name: "Browse", item: `${SITE_URL}/search` },
                ...(listing.category
                  ? [{ "@type": "ListItem", position: 3, name: listing.category.name, item: `${SITE_URL}/search?category=${listing.category.slug}` }]
                  : []),
                { "@type": "ListItem", position: listing.category ? 4 : 3, name: listing.title },
              ],
            }),
          }}
        />

        {/* Admin preview banner */}
        {isAdminPreview && (
          <div className="flex items-center gap-2 border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
            <span className="font-medium">Admin preview</span>
            <span className="text-muted-foreground">— This listing is not publicly visible.</span>
            <StatusBadge status={listing.status} className="ml-auto border-0" />
          </div>
        )}

        {/* Featured banner */}
        {isFeaturedNow(listing.featured_until) && (
          <div className="flex items-center gap-2 border border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-2.5 text-sm">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
            <span className="font-medium text-amber-700 dark:text-amber-400">Featured listing</span>
            <span className="text-muted-foreground">— This listing is promoted for increased visibility.</span>
          </div>
        )}

        {/* Breadcrumb */}
        <PageBreadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Browse", href: "/search" },
            { label: listing.title },
          ]}
        />

        {/* Title block */}
        <div className="space-y-1.5">
          {listing.category && (
            <Link
              href={`/search?category=${listing.category.slug}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              {listing.category.name}
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl leading-tight">
              {listing.title}
            </h1>
            {isFeaturedNow(listing.featured_until) && <FeaturedBadge />}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
            {locationText && (
              <p className="text-muted-foreground text-sm inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {locationText}
              </p>
            )}
            {formatPrice(listing) && locationText && (
              <span className="text-muted-foreground/40 text-sm">·</span>
            )}
            {formatPrice(listing) && (
              <p className="text-base font-semibold text-foreground">{formatPrice(listing)}</p>
            )}
          </div>
        </div>

        {/* Images */}
        {images.length > 0 && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                <Image
                  src={images[0].url}
                  alt={`${listing.title} — primary image`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 672px"
                  priority
                />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto border-t border-border">
                  {images.slice(1, 6).map((img) => (
                    <div key={img.id} className="relative h-16 w-24 shrink-0 overflow-hidden rounded border border-border bg-muted">
                      <Image src={img.url} alt={`${listing.title} — photo`} fill className="object-cover" sizes="96px" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Why This Business? — highlight selling points */}
        {highlights.length > 0 && (
          <Card className="border-primary/20 bg-primary/[0.03]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                Why this business?
              </CardTitle>
              <CardDescription>Key selling points</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 sm:grid-cols-2">
                {highlights.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-2.5 border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      h.accent === "primary" ? "bg-primary/15 text-primary" :
                      h.accent === "warning" ? "bg-warning/15 text-[var(--warning-foreground)]" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      ✓
                    </span>
                    <span className="font-medium text-foreground">{h.label}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {listing.summary && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{listing.summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {listing.description && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionRenderer content={listing.description} />
            </CardContent>
          </Card>
        )}

        {/* Key details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Key details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              {listing.revenue != null && (
                <div className="flex items-center justify-between py-3 text-sm">
                  <dt className="text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground/70" />
                    Revenue
                  </dt>
                  <dd className="font-medium text-foreground">
                    {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(Number(listing.revenue))}
                  </dd>
                </div>
              )}
              {listing.profit != null && (
                <div className="flex items-center justify-between py-3 text-sm">
                  <dt className="text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground/70" />
                    Profit
                  </dt>
                  <dd className="font-medium text-foreground">
                    {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(Number(listing.profit))}
                  </dd>
                </div>
              )}
              {listing.lease_details && (
                <div className="flex items-center justify-between py-3 text-sm">
                  <dt className="text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground/70" />
                    Lease
                  </dt>
                  <dd className="font-medium text-foreground text-right max-w-[60%]">{listing.lease_details}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Interactive Map */}
        {locationText && (
          <LocationMap location={locationText} />
        )}

        {/* Broker */}
        {broker?.slug && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Contact broker</CardTitle>
              <CardDescription>Listed by this broker</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {broker.photo_url && (
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                    <Image
                      src={broker.photo_url}
                      alt={broker.name ?? "Broker"}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                )}
                <div className="flex flex-1 items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-0.5">
                    <p className="font-medium leading-snug">{broker.name ?? broker.company ?? "Broker"}</p>
                    {broker.company && broker.name && (
                      <p className="text-sm text-muted-foreground">{broker.company}</p>
                    )}
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/broker/${broker.slug}`}>View profile</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enquiry form */}
        <EnquiryForm listingId={listing.id} listingTitle={listing.title} />

        {/* Listing Ad Slot */}
        <AdSlot placement="listing" layout="banner" limit={1} />
      </main>
    </div>
  );
}