import { notFound } from "next/navigation";
import { getListingByIdAdmin, adminUpdateListing } from "@/lib/actions/admin-listings";
import { EditListingForm } from "@/app/dashboard/listings/[id]/edit/edit-listing-form";

type Props = { params: Promise<{ id: string }> };

async function handleAdminSave(
  id: string,
  fields: Record<string, unknown>,
  highlightIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  "use server";
  const { highlight_ids: _unused, ...updateFields } = fields as Record<string, unknown> & { highlight_ids?: string[] };
  return adminUpdateListing(id, updateFields as Parameters<typeof adminUpdateListing>[1], highlightIds);
}

export default async function AdminEditListingPage({ params }: Props) {
  const { id } = await params;
  const listing = await getListingByIdAdmin(id);
  if (!listing) notFound();

  const highlightIds = (listing.listing_highlights ?? []).map(
    (h: { id: string }) => h.id
  );

  return (
    <EditListingForm
      listing={{
        ...(listing as any),
        highlight_ids: highlightIds,
      }}
      isAdmin
      onAdminSave={handleAdminSave}
    />
  );
}
