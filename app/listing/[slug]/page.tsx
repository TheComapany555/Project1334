import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getListingBySlug,
  getListingBySlugForOwner,
} from "@/lib/actions/listings";
import { getListingBySlugAdmin } from "@/lib/actions/admin-listings";
import { getListingsComingSoon } from "@/lib/actions/site-settings";
import { NOINDEX_ROBOTS } from "@/lib/seo/noindex";
import { ListingsComingSoon } from "@/components/listings/listings-coming-soon";
import { getSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { PublicHeader } from "@/components/public-header";
import { Eye } from "lucide-react";
import { isListingFeaturedAnywhere } from "@/components/listings/featured-badge";
import { EnquiryForm } from "./enquiry-form";
import { AdSlot } from "@/components/ads/ad-slot";
import {
  ListingDetailView,
  EnquiryPreviewPlaceholder,
} from "@/components/listings/listing-detail-view";
import { DocumentVault } from "@/components/listings/document-vault";
import { FavoriteButton } from "@/components/listings/favorite-button";
import { CompareButton } from "@/components/listings/compare-button";
import { getPublicListingDocuments } from "@/lib/actions/documents";
import { getListingEnquiryFormConfig } from "@/lib/actions/enquiry-form-config";
import { getListingNdaStatus } from "@/lib/actions/nda";
import { isFavorited } from "@/lib/actions/favorites";
import { getComparisonListingIds } from "@/lib/actions/comparison";
import { ListingViewTracker } from "@/components/listings/listing-view-tracker";
import { CallTrackingButton } from "@/components/listings/call-tracking-button";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";

// Revalidate listing pages every 10 minutes
export const revalidate = 600;

type Props = { params: Promise<{ slug: string }> };

const SITE_URL = getSiteUrl();

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // A broker previewing their own listing gets its title; nobody else learns anything.
  const ownListing = await getListingBySlugForOwner(slug);
  if (ownListing) {
    return { title: `Preview: ${ownListing.title}`, robots: NOINDEX_ROBOTS };
  }
  // While coming-soon mode is on, never leak listing details via meta tags.
  if (await getListingsComingSoon()) {
    return { title: "Coming soon", robots: { index: false, follow: false } };
  }
  const listing = await getListingBySlug(slug);
  if (!listing) {
    return { title: "Listing not found", robots: NOINDEX_ROBOTS };
  }
  const location =
    listing.location_text ||
    [listing.suburb, listing.state].filter(Boolean).join(", ");
  const title = listing.title;
  const description =
    listing.summary?.slice(0, 155) ??
    `${listing.title}${location ? ` in ${location}` : ""} — View details on Salebiz`;
  const image = listing.listing_images?.[0]?.url;
  const url = `${SITE_URL}/listing/${slug}`;
  return {
    title,
    description,
    // Listing pages are not indexed by standing policy (see lib/seo/noindex.ts).
    // The OpenGraph/Twitter tags below are kept regardless: they drive link
    // previews when a broker shares a listing, which noindex does not affect.
    robots: NOINDEX_ROBOTS,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      ...(image && {
        images: [{ url: image, width: 1200, height: 630, alt: title }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;

  const [session, comingSoon] = await Promise.all([
    getSession(),
    getListingsComingSoon(),
  ]);

  // Brokers can always preview their own listing on its real URL (draft, private,
  // unpublished, or hidden by coming-soon mode). Only the owner ever gets a row back.
  const ownListing =
    session?.user?.role === "broker"
      ? await getListingBySlugForOwner(slug)
      : null;

  // Coming-soon mode hides listings from everyone except admins and the owner.
  if (comingSoon && session?.user?.role !== "admin" && !ownListing) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <PublicHeader session={session} maxWidth="max-w-6xl" />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
          <ListingsComingSoon />
        </main>
      </div>
    );
  }

  // Try public view first; if not found, try admin view (no status filter)
  let listing = comingSoon && ownListing ? null : await getListingBySlug(slug);
  let isAdminPreview = false;
  if (!listing) {
    if (session?.user?.role === "admin") {
      listing = (await getListingBySlugAdmin(slug)) as typeof listing;
      isAdminPreview = !!listing;
    }
  }
  // The owner sees the preview banner whenever buyers would NOT see this page.
  const ownerPreview = !listing && !!ownListing;
  if (ownerPreview) listing = ownListing;
  if (!listing) notFound();

  const broker = listing.broker;
  const images = listing.listing_images ?? [];
  const highlights = listing.listing_highlights ?? [];
  const locationText =
    listing.location_text ||
    [listing.suburb, listing.state].filter(Boolean).join(", ") ||
    "";

  // Fetch NDA status, documents, favorites, and comparison data
  const [ndaStatus, documentData, isFav, comparisonIds, enquiryFormConfig] =
    await Promise.all([
      getListingNdaStatus(listing.id),
      getPublicListingDocuments(listing.id, session?.user?.id ?? null),
      session?.user?.id ? isFavorited(listing.id) : Promise.resolve(false),
      session?.user?.id ? getComparisonListingIds() : Promise.resolve([]),
      getListingEnquiryFormConfig(listing.id),
    ]);
  const isInComparison = comparisonIds.includes(listing.id);

  // Auto-fill enquiry form for logged-in buyers (Feature 2).
  let enquiryDefaults:
    | {
        contact_name?: string | null;
        contact_email?: string | null;
        contact_phone?: string | null;
      }
    | undefined;
  if (session?.user?.role === "user" && session.user.id) {
    const supabaseAdmin = createServiceRoleClient();
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name, phone")
      .eq("id", session.user.id)
      .maybeSingle();
    enquiryDefaults = {
      contact_name: profile?.name ?? session.user.name ?? null,
      contact_email: session.user.email ?? null,
      contact_phone: profile?.phone ?? null,
    };
  }
  const isLoggedIn = !!session?.user?.id;

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <PublicHeader session={session} maxWidth="max-w-6xl" />
      {!ownerPreview && <ListingViewTracker listingId={listing.id} />}

      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 space-y-6 overflow-x-clip px-4 py-8 sm:py-10">
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
              ...(images.length > 0 && {
                image: images.map((img) => img.url),
              }),
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
                  ...(broker.slug && {
                    url: `${SITE_URL}/broker/${broker.slug}`,
                  }),
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
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: SITE_URL,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Browse",
                  item: `${SITE_URL}/search`,
                },
                ...(listing.category
                  ? [
                      {
                        "@type": "ListItem",
                        position: 3,
                        name: listing.category.name,
                        item: `${SITE_URL}/search?category=${listing.category.slug}`,
                      },
                    ]
                  : []),
                {
                  "@type": "ListItem",
                  position: listing.category ? 4 : 3,
                  name: listing.title,
                },
              ],
            }),
          }}
        />

        {/* Admin preview banner */}
        {isAdminPreview && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
            <span className="font-medium">Admin preview</span>
            <span className="min-w-0 text-muted-foreground">
              — This listing is not publicly visible.
            </span>
            <StatusBadge
              status={listing.status}
              className="ml-0 shrink-0 border-0 sm:ml-auto"
            />
          </div>
        )}

        {ownerPreview && (
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-primary/25 bg-primary/[0.04] px-4 py-3 text-sm">
            <Eye className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p className="min-w-0 flex-1">
              <span className="font-medium">Preview.</span>{" "}
              <span className="text-muted-foreground">
                {listing.is_private
                  ? "This is a private listing. Only you and your agency can see this page."
                  : listing.status === "published"
                    ? "Buyers see a Coming Soon page until listings open on Salebiz."
                    : "Buyers can't see this page until you publish it."}
              </span>
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={listing.status} className="border-0" />
              <Button size="sm" variant="outline" asChild>
                <Link href={`/dashboard/listings/${listing.id}/edit`}>
                  Edit listing
                </Link>
              </Button>
            </div>
          </div>
        )}

        <ListingDetailView
          data={{
            title: listing.title,
            category: listing.category ?? null,
            subcategory: listing.subcategory ?? null,
            exclusivity: listing.exclusivity,
            locationText,
            price_type: listing.price_type,
            asking_price: listing.asking_price,
            revenue: listing.revenue,
            profit: listing.profit,
            lease_details: listing.lease_details,
            summary: listing.summary,
            description: listing.description,
            images: images.map((img) => ({ id: img.id, url: img.url })),
            highlights,
            broker: broker ?? null,
            agency: listing.agency ?? null,
            featured: isListingFeaturedAnywhere(listing),
          }}
          titleActions={
            ownerPreview ? undefined : (
              <>
                <FavoriteButton
                  listingId={listing.id}
                  isFavorited={isFav}
                  isLoggedIn={isLoggedIn}
                  size="sm"
                />
                <CompareButton
                  listingId={listing.id}
                  isInComparison={isInComparison}
                  isLoggedIn={isLoggedIn}
                  size="sm"
                />
              </>
            )
          }
          callAction={
            broker?.phone ? (
              <CallTrackingButton
                phone={broker.phone}
                listingId={listing.id}
                brokerId={listing.broker_id}
                variant="outline"
                className="w-full gap-2"
              >
                Call
              </CallTrackingButton>
            ) : undefined
          }
          documents={
            (documentData.documents.length > 0 ||
              documentData.lockedConfidentialCount > 0) && (
              <DocumentVault
                listingId={listing.id}
                documents={documentData.documents}
                requiresNda={documentData.requiresNda}
                hasSigned={documentData.hasSigned}
                lockedConfidentialCount={documentData.lockedConfidentialCount}
                ndaText={ndaStatus.ndaText}
                isLoggedIn={!!session?.user?.id}
              />
            )
          }
          enquiry={
            ownerPreview ? (
              <EnquiryPreviewPlaceholder />
            ) : (
              <EnquiryForm
                listingId={listing.id}
                listingTitle={listing.title}
                defaults={enquiryDefaults}
                formConfig={enquiryFormConfig}
              />
            )
          }
        />

        {/* Listing Ad Slot */}
        <AdSlot placement="listing" layout="banner" limit={1} />
      </main>
    </div>
  );
}
