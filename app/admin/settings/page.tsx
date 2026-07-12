import { getListingsComingSoonDetails } from "@/lib/actions/site-settings";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const { enabled, updatedAt } = await getListingsComingSoonDetails();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Global site settings. Changes take effect immediately."
      />
      <SettingsForm initialComingSoon={enabled} initialUpdatedAt={updatedAt} />
    </div>
  );
}
