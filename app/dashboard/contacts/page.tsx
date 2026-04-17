import { getContacts } from "@/lib/actions/contacts";
import { getContactTags } from "@/lib/actions/contact-tags";
import { getListingsByBroker } from "@/lib/actions/listings";
import { PageHeader } from "@/components/admin/page-header";
import { ContactsClientView } from "./contacts-client-view";

export default async function ContactsPage() {
  const [contacts, tags, listings] = await Promise.all([
    getContacts(),
    getContactTags(),
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
      <ContactsClientView
        contacts={contacts}
        tags={tags}
        listings={publishedListings}
      />
    </div>
  );
}
