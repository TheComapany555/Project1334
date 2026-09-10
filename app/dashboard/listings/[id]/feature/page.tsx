import { notFound } from "next/navigation";
import { getListingById } from "@/lib/actions/listings";
import { getFeaturedOptionsForListing } from "@/lib/actions/products";
import { isBillingEnabled } from "@/lib/billing-mode";
import { FeatureListingView } from "./feature-listing-view";

type Props = { params: Promise<{ id: string }> };

export default async function FeatureListingPage({ params }: Props) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  const [options, billingEnabled] = await Promise.all([
    getFeaturedOptionsForListing(listing.category_id),
    isBillingEnabled(),
  ]);

  return (
    <FeatureListingView
      listing={{
        id: listing.id,
        title: listing.title,
        slug: listing.slug,
        category: listing.category ?? null,
        featured_homepage_until: listing.featured_homepage_until,
        featured_category_until: listing.featured_category_until,
      }}
      options={options}
      billingEnabled={billingEnabled}
    />
  );
}
