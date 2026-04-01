import { notFound } from "next/navigation";
import { getListingById } from "@/lib/actions/listings";
import { getListingNda, getNdaSignaturesForListing } from "@/lib/actions/nda";
import { NdaManager } from "./nda-manager";

type Props = { params: Promise<{ id: string }> };

export default async function ListingNdaPage({ params }: Props) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  const nda = await getListingNda(listing.id);
  const signatures = nda ? await getNdaSignaturesForListing(listing.id) : [];

  return (
    <NdaManager
      listingId={listing.id}
      listingTitle={listing.title}
      initialNda={nda}
      signatures={signatures}
    />
  );
}
