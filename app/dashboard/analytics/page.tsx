import { getBrokerAnalytics } from "@/lib/actions/analytics";
import { AnalyticsDashboard } from "./analytics-dashboard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const data = await getBrokerAnalytics(30);
  return <AnalyticsDashboard initialData={data} />;
}
