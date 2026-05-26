import {
  getAdminBrokerProfileContacts,
  getAdminEnquiryContacts,
  getAdminUsers,
} from "@/lib/actions/admin-contacts";
import { PageHeader } from "@/components/admin/page-header";
import { AdminContactsView } from "./admin-contacts-view";

export default async function AdminContactsPage() {
  const [users, enquiryContacts, profileContacts] = await Promise.all([
    getAdminUsers(),
    getAdminEnquiryContacts(),
    getAdminBrokerProfileContacts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contact Database"
        description="Registered users, listing enquiry contacts, and broker profile contact requests."
      />
      <AdminContactsView
        users={users}
        enquiryContacts={enquiryContacts}
        profileContacts={profileContacts}
      />
    </div>
  );
}
