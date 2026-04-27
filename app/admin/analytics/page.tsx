import { getAdminAnalytics } from "@/lib/actions/admin-analytics";
import { PageHeader } from "@/components/admin/page-header";
import { AnalyticsTabs } from "./analytics-tabs";
import { OverviewTab } from "./_tabs/overview-tab";
import { RevenueTab } from "./_tabs/revenue-tab";
import { ListingsTab } from "./_tabs/listings-tab";
import { EngagementTab } from "./_tabs/engagement-tab";
import { UsersTab } from "./_tabs/users-tab";
import { MarketingTab } from "./_tabs/marketing-tab";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const analytics = await getAdminAnalytics();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform analytics"
        description="A live view of revenue, listings, engagement and user growth across Salebiz."
        action={
          <p className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
            Updated {new Date(analytics.generatedAt).toLocaleString("en-AU")}
          </p>
        }
      />

      <AnalyticsTabs
        overview={<OverviewTab analytics={analytics} />}
        revenue={<RevenueTab analytics={analytics} />}
        listings={<ListingsTab analytics={analytics} />}
        engagement={<EngagementTab analytics={analytics} />}
        users={<UsersTab analytics={analytics} />}
        marketing={<MarketingTab analytics={analytics} />}
      />
    </div>
  );
}
