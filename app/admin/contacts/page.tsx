import { getAdminUsers, getAdminEnquiryContacts } from "@/lib/actions/admin-contacts";
import { PageHeader } from "@/components/admin/page-header";
import { AdminContactsView } from "./admin-contacts-view";

export default async function AdminContactsPage() {
  const [users, enquiryContacts] = await Promise.all([
    getAdminUsers(),
    getAdminEnquiryContacts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contact Database"
        description="All registered users and enquiry contacts for marketing and communications."
      />
      <AdminContactsView users={users} enquiryContacts={enquiryContacts} />
    </div>
  );
}
