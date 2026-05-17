import { notFound } from "next/navigation";
import { getListingById } from "@/lib/actions/listings";
import { getListingEnquiryFormConfig } from "@/lib/actions/enquiry-form-config";
import { EnquiryFormConfigEditor } from "./enquiry-form-config-editor";

type Props = { params: Promise<{ id: string }> };

export default async function ListingEnquiryFormPage({ params }: Props) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  const config = await getListingEnquiryFormConfig(listing.id);

  return (
    <EnquiryFormConfigEditor
      listingId={listing.id}
      listingTitle={listing.title}
      initialConfig={config}
    />
  );
}
