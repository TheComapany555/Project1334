import { notFound } from "next/navigation";
import { getListingById } from "@/lib/actions/listings";
import { EditListingForm } from "./edit-listing-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();
  const highlightIds = (listing.listing_highlights ?? []).map((h) => h.id);
  return (
    <EditListingForm
      listing={{
        ...listing,
        highlight_ids: highlightIds,
      }}
    />
  );
}
