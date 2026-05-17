import { notFound } from "next/navigation";
import { getListingById } from "@/lib/actions/listings";
import { getListingNda } from "@/lib/actions/nda";
import { getListingDocuments } from "@/lib/actions/documents";
import {
  listListingDataRoomAccess,
  getListingDataRoomCounts,
} from "@/lib/actions/data-room";
import { DataRoomManager } from "./data-room-manager";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ListingDataRoomPage({
  params,
  searchParams,
}: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const listing = await getListingById(id);
  if (!listing) notFound();

  const [nda, documents, accessRows, counts] = await Promise.all([
    getListingNda(listing.id),
    getListingDocuments(listing.id),
    listListingDataRoomAccess(listing.id),
    getListingDataRoomCounts(listing.id),
  ]);

  return (
    <DataRoomManager
      listingId={listing.id}
      listingTitle={listing.title}
      initialTab={sp.tab ?? "access"}
      initialNda={nda}
      documents={documents}
      accessRows={accessRows}
      counts={counts}
    />
  );
}
