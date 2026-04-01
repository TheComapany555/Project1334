import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth-client";
import { getUserFavorites } from "@/lib/actions/favorites";
import { getComparisonListingIds } from "@/lib/actions/comparison";
import { PublicHeader } from "@/components/public-header";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/listings/favorite-button";
import { CompareButton } from "@/components/listings/compare-button";
import {
  Heart,
  MapPin,
  ArrowRight,
  GitCompareArrows,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Saved Listings",
  description: "Your saved business listings",
};

function formatPrice(listing: { price_type: string; asking_price: number | null }): string {
  if (listing.price_type === "poa") return "POA";
  if (listing.asking_price != null) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(Number(listing.asking_price));
  }
  return "";
}

export default async function SavedListingsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/saved");
  }

  const [{ listings, listingIds }, comparisonIds] = await Promise.all([
    getUserFavorites(),
    getComparisonListingIds(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader session={session} maxWidth="max-w-6xl" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10 space-y-6">
        <PageBreadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Saved Listings" },
          ]}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Saved Listings
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {listings.length} saved listing{listings.length !== 1 ? "s" : ""}
            </p>
          </div>
          {comparisonIds.length > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/compare">
                <GitCompareArrows className="h-4 w-4 mr-1.5" />
                Compare ({comparisonIds.length})
              </Link>
            </Button>
          )}
        </div>

        {listings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">No saved listings yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Browse listings and click the heart icon to save them here.
                </p>
              </div>
              <Button asChild>
                <Link href="/search">
                  Browse Listings
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => {
              const image = listing.listing_images?.[0]?.url;
              const locationText =
                listing.location_text ||
                [listing.suburb, listing.state].filter(Boolean).join(", ") ||
                "";

              return (
                <Card key={listing.id} className="overflow-hidden group">
                  <Link href={`/listing/${listing.slug}`}>
                    {image ? (
                      <div className="relative aspect-[16/10] w-full bg-muted">
                        <Image
                          src={image}
                          alt={listing.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[16/10] w-full bg-muted flex items-center justify-center">
                        <span className="text-sm text-muted-foreground">
                          No image
                        </span>
                      </div>
                    )}
                  </Link>
                  <CardContent className="p-4 space-y-2">
                    <Link
                      href={`/listing/${listing.slug}`}
                      className="text-sm font-medium leading-snug hover:underline line-clamp-2"
                    >
                      {listing.title}
                    </Link>

                    <div className="flex items-center gap-2 flex-wrap">
                      {listing.category && (
                        <Badge variant="outline" className="text-[10px]">
                          {listing.category.name}
                        </Badge>
                      )}
                      {locationText && (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {locationText}
                        </span>
                      )}
                    </div>

                    {formatPrice(listing) && (
                      <p className="text-sm font-semibold">
                        {formatPrice(listing)}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 pt-1">
                      <FavoriteButton
                        listingId={listing.id}
                        isFavorited={true}
                        isLoggedIn={true}
                        size="sm"
                      />
                      <CompareButton
                        listingId={listing.id}
                        isInComparison={comparisonIds.includes(listing.id)}
                        isLoggedIn={true}
                        size="sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
