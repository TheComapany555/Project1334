import Link from "next/link";
import { Settings2 } from "lucide-react";
import { getContacts } from "@/lib/actions/contacts";
import { getContactTags } from "@/lib/actions/contact-tags";
import { getListingsByBroker } from "@/lib/actions/listings";
import { getBrokerBccAddress } from "@/lib/actions/crm-email";
import { getFollowUpsDueToday } from "@/lib/actions/crm";
import {
  listCustomFields,
  getCustomFieldValuesForContacts,
} from "@/lib/actions/crm-custom-fields";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { ContactsClientView } from "./contacts-client-view";
import { BccAddressCard } from "./bcc-address-card";
import { FollowUpsBanner } from "@/components/dashboard/follow-ups-banner";

export default async function ContactsPage() {
  const [contacts, tags, listings, bcc, followUps, customFields] =
    await Promise.all([
      getContacts(),
      getContactTags(),
      getListingsByBroker(),
      getBrokerBccAddress().catch(() => null),
      getFollowUpsDueToday().catch(() => []),
      listCustomFields().catch(() => []),
    ]);

  const customFieldValues =
    customFields.length > 0
      ? await getCustomFieldValuesForContacts(contacts.map((c) => c.id)).catch(
          () => ({}),
        )
      : {};

  const publishedListings = listings
    .filter((l) => l.status === "published")
    .map((l) => ({
      id: l.id,
      title: l.title,
      slug: l.slug,
      asking_price: l.asking_price,
      price_type: l.price_type,
      location_text: l.location_text,
    }));

  // Map contact_id → display name so the banner can show "Joe Smith · Send Q3 P&L"
  // without doing N round-trips client-side. Falls back to email if name is null.
  const contactNameById: Record<string, string | null> = {};
  for (const c of contacts) {
    contactNameById[c.id] = c.name?.trim() || c.email;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="CRM"
          description="Your saved contacts from enquiries and manual entries. Send listings directly via email."
        />
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link href="/dashboard/agency/custom-fields">
            <Settings2 className="h-4 w-4" />
            Custom fields
          </Link>
        </Button>
      </div>
      <FollowUpsBanner
        followUps={followUps}
        contactNameById={contactNameById}
      />
      {bcc && <BccAddressCard email={bcc.email} />}
      <ContactsClientView
        contacts={contacts}
        tags={tags}
        listings={publishedListings}
        customFields={customFields}
        customFieldValues={customFieldValues}
      />
    </div>
  );
}
