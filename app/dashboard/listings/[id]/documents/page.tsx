import { notFound } from "next/navigation";
import { getListingById } from "@/lib/actions/listings";
import { getListingDocuments } from "@/lib/actions/documents";
import { DocumentManager } from "./document-manager";

type Props = { params: Promise<{ id: string }> };

export default async function ListingDocumentsPage({ params }: Props) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  const documents = await getListingDocuments(listing.id);

  return (
    <DocumentManager
      listingId={listing.id}
      listingTitle={listing.title}
      initialDocuments={documents}
    />
  );
}
