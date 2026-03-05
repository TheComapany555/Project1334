import { getEnquiriesByBroker } from "@/lib/actions/enquiries";
import { buildEnquiriesChartData } from "@/lib/chart-data";
import { ENQUIRY_REASON_LABELS } from "@/lib/types/enquiries";
import { CHART_COLORS } from "@/lib/chart-theme";
import { Badge } from "@/components/ui/badge";
import { ChartBarEnquiriesBroker } from "@/components/dashboard/chart-bar-enquiries-broker";
import { ChartDonut } from "@/components/admin/chart-donut";
import { PageHeader } from "@/components/admin/page-header";
import { EnquiriesClientView } from "./enquiries-client-view";

const REASON_COLORS: Record<string, string> = {
  "General enquiry": CHART_COLORS.primary,
  "Request viewing": CHART_COLORS.info,
  "Make an offer": CHART_COLORS.warning,
  Other: CHART_COLORS.purple,
};

export default async function EnquiriesPage() {
  const enquiries = await getEnquiriesByBroker();
  const total = enquiries.length;

  const newThisWeek = enquiries.filter((e) => {
    const diff = Date.now() - new Date(e.created_at).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const enquiriesChartData = buildEnquiriesChartData(enquiries);

  // Group enquiries by reason for donut chart
  const reasonCounts = new Map<string, number>();
  for (const e of enquiries) {
    const label = (e.reason && ENQUIRY_REASON_LABELS[e.reason]) || "Other";
    reasonCounts.set(label, (reasonCounts.get(label) || 0) + 1);
  }
  const reasonSegments = Array.from(reasonCounts.entries()).map(([name, value]) => ({
    name,
    value,
    color: REASON_COLORS[name] ?? CHART_COLORS.muted,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquiries"
        description="Messages from buyers interested in your listings."
        action={
          total > 0 && newThisWeek > 0 ? (
            <Badge className="w-fit gap-1.5" variant="success">
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80 animate-pulse" />
              {newThisWeek} new this week
            </Badge>
          ) : undefined
        }
      />

      {/* ── Enquiries charts ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ChartBarEnquiriesBroker
          data={enquiriesChartData}
          footer={{ description: "Enquiries received per month — last 6 months" }}
        />
        <ChartDonut
          title="Enquiries by reason"
          segments={reasonSegments}
        />
      </div>

      <EnquiriesClientView enquiries={enquiries} />
    </div>
  );
}
