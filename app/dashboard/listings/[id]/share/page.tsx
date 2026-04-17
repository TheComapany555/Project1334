import { notFound } from "next/navigation";
import { getListingById } from "@/lib/actions/listings";
import { getContacts } from "@/lib/actions/contacts";
import { getContactTags } from "@/lib/actions/contact-tags";
import { ShareListingView } from "./share-listing-view";

type Props = { params: Promise<{ id: string }> };

export default async function ShareListingPage({ params }: Props) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  const [contacts, tags] = await Promise.all([getContacts(), getContactTags()]);

  return (
    <ShareListingView
      listing={{
        id: listing.id,
        title: listing.title,
        slug: listing.slug,
        location_text: listing.location_text,
        asking_price: listing.asking_price,
        price_type: listing.price_type,
      }}
      contacts={contacts}
      tags={tags}
    />
  );
}
