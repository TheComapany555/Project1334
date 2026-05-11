import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-client";
import {
  listCustomFields,
  canManageCustomFields,
} from "@/lib/actions/crm-custom-fields";
import { PageHeader } from "@/components/admin/page-header";
import { CustomFieldsManager } from "./custom-fields-manager";

export default async function CustomFieldsPage() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "broker") redirect("/403");

  const [fields, canManage] = await Promise.all([
    listCustomFields(),
    canManageCustomFields(),
  ]);

  const ownership = session.user.agencyId ? "agency" : "broker";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom CRM fields"
        description={
          ownership === "agency"
            ? "Define columns shared across all brokers in your agency. Changes apply to everyone."
            : "Define columns for your CRM. Just for your account."
        }
      />
      <CustomFieldsManager
        initialFields={fields}
        canManage={canManage}
        ownership={ownership}
      />
    </div>
  );
}
