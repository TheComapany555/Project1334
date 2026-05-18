import { listBrokerActivities } from "@/lib/actions/crm";
import { PageHeader } from "@/components/admin/page-header";
import { ActivityFeedView } from "./activity-feed-view";

export const dynamic = "force-dynamic";

export default async function ActivityFeedPage() {
  // Initial server payload — broad fetch the client narrows further.
  const initial = await listBrokerActivities({ limit: 100 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        description="Every email, call, note, follow-up, status change, and message logged across your CRM. Scoped to your buyers only."
      />
      <ActivityFeedView initialItems={initial} />
    </div>
  );
}
