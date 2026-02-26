import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getListingBySlug } from "@/lib/actions/listings";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnquiryForm } from "./enquiry-form";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) {
    return { title: "Listing not found | Salebiz" };
  }
  const title = listing.title;
  const description = listing.summary?.slice(0, 160) ?? listing.title;
  const image = listing.listing_images?.[0]?.url;
  return {
    title: `${title} | Salebiz`,
    description,
    openGraph: {
      title: `${title} | Salebiz`,
      description,
      ...(image && { images: [{ url: image }] }),
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
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const broker = listing.broker;
  const images = listing.listing_images ?? [];
  const highlights = listing.listing_highlights ?? [];
  const locationParts = [listing.suburb, listing.state, listing.postcode].filter(Boolean);
  const locationText = locationParts.length ? locationParts.join(", ") : listing.location_text ?? "";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-3xl flex h-14 sm:h-16 items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center shrink-0 font-semibold text-foreground" aria-label="Salebiz home">
            <Image src="/Salebiz.png" alt="" width={100} height={30} className="h-7 w-auto object-contain sm:h-8" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Button variant="outline" size="sm" asChild>
              <Link href="/search">Browse listings</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10 space-y-6">

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
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl leading-tight">
            {listing.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
            {locationText && (
              <p className="text-muted-foreground text-sm">{locationText}</p>
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
                  alt=""
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
                      <Image src={img.url} alt="" fill className="object-cover" sizes="96px" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tags / Highlights */}
        {highlights.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {highlights.map((h) => (
                <Badge
                  key={h.id}
                  variant={h.accent === "warning" ? "warning" : h.accent === "primary" ? "default" : "secondary"}
                  className="border-0"
                >
                  {h.label}
                </Badge>
              ))}
            </div>
          </div>
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
              <div className="text-muted-foreground whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert leading-relaxed">
                {listing.description}
              </div>
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
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <dt className="text-muted-foreground">Revenue</dt>
                  <dd className="font-medium text-foreground">
                    {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(Number(listing.revenue))}
                  </dd>
                </div>
              )}
              {listing.profit != null && (
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <dt className="text-muted-foreground">Profit</dt>
                  <dd className="font-medium text-foreground">
                    {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(Number(listing.profit))}
                  </dd>
                </div>
              )}
              {listing.lease_details && (
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <dt className="text-muted-foreground">Lease</dt>
                  <dd className="font-medium text-foreground text-right max-w-[60%]">{listing.lease_details}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

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
        <EnquiryForm listingId={listing.id} />
      </main>
    </div>
  );
}