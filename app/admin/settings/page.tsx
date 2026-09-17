import {
  getListingsComingSoonDetails,
  getBasicListingsSearchableDetails,
  getBillingEnabledDetails,
  getPromoteFeaturedDetails,
} from "@/lib/actions/site-settings";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const [{ enabled, updatedAt }, basic, billing, promote] = await Promise.all([
    getListingsComingSoonDetails(),
    getBasicListingsSearchableDetails(),
    getBillingEnabledDetails(),
    getPromoteFeaturedDetails(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Global site settings. Changes take effect immediately."
      />
      <SettingsForm
        initialComingSoon={enabled}
        initialUpdatedAt={updatedAt}
        initialBasicSearchable={basic.enabled}
        basicSearchableAvailable={basic.available}
        initialBillingEnabled={billing.enabled}
        billingAvailable={billing.available}
        initialPromoteFeatured={promote.enabled}
        promoteFeaturedAvailable={promote.available}
      />
    </div>
  );
}
