import { listFollowUps } from "@/lib/actions/crm";
import { PageHeader } from "@/components/admin/page-header";
import { FollowUpsView } from "./follow-ups-view";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  // Pre-fetch all four scopes server-side so tab counts render instantly.
  const [overdue, today, upcoming, completed] = await Promise.all([
    listFollowUps("overdue").catch(() => []),
    listFollowUps("today").catch(() => []),
    listFollowUps("upcoming").catch(() => []),
    listFollowUps("completed", { limit: 100 }).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        description="Every task you've scheduled with a buyer. Overdue ones surface at the top of your CRM too."
      />
      <FollowUpsView
        initialOverdue={overdue}
        initialToday={today}
        initialUpcoming={upcoming}
        initialCompleted={completed}
      />
    </div>
  );
}
