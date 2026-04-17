import { notFound } from "next/navigation";
import { getListingById } from "@/lib/actions/listings";
import { getListingNda } from "@/lib/actions/nda";
import { ShareExternalView } from "./share-external-view";

type Props = { params: Promise<{ id: string }> };

export default async function ShareExternalPage({ params }: Props) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  const nda = await getListingNda(listing.id).catch(() => null);

  return (
    <ShareExternalView
      listing={{
        id: listing.id,
        title: listing.title,
        slug: listing.slug,
        location_text: listing.location_text,
        asking_price: listing.asking_price,
        price_type: listing.price_type,
      }}
      ndaRequired={!!nda?.is_required}
    />
  );
}
