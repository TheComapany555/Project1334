import { getContacts } from "@/lib/actions/contacts";
import { getListingsByBroker } from "@/lib/actions/listings";
import { PageHeader } from "@/components/admin/page-header";
import { ContactsClientView } from "./contacts-client-view";

export default async function ContactsPage() {
  const [contacts, listings] = await Promise.all([
    getContacts(),
    getListingsByBroker(),
  ]);

  const publishedListings = listings
    .filter((l) => l.status === "published")
    .map((l) => ({ id: l.id, title: l.title }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="Your saved contacts from enquiries and manual entries. Send listings directly via email."
      />
      <ContactsClientView contacts={contacts} listings={publishedListings} />
    </div>
  );
}
