import { getAllEnquiries, getEnquiryChartData } from "@/lib/actions/enquiries";
import { getBrokersForAdmin } from "@/lib/actions/admin-brokers";
import { ENQUIRY_REASON_LABELS } from "@/lib/types/enquiries";
import { buildEnquiriesChartData } from "@/lib/chart-data";
import { PageHeader } from "@/components/admin/page-header";
import { ChartBarEnquiries } from "@/components/admin/chart-bar-enquiries";
import { ChartDonut } from "@/components/admin/chart-donut";
import { EnquiriesClientView } from "./enquiries-client-view";

const REASON_COLORS: Record<string, string> = {
  "General enquiry": "oklch(0.45 0.12 155)",
  "Request viewing": "oklch(0.55 0.14 220)",
  "Make an offer": "oklch(0.7 0.15 75)",
  Other: "oklch(0.55 0.15 290)",
};

export default async function AdminEnquiriesPage() {
  const [brokers, { enquiries }, chartRows] = await Promise.all([
    getBrokersForAdmin(),
    getAllEnquiries({ page: 1, pageSize: 100 }),
    getEnquiryChartData(),
  ]);

  const brokerOptions = brokers.map((b) => ({
    value: b.id,
    label: b.name || b.company || b.email || b.id,
  }));

  // Chart data from lightweight query
  const enquiriesChartData = buildEnquiriesChartData(
    chartRows.map((e) => ({ created_at: e.created_at }))
  );

  const reasonCounts = new Map<string, number>();
  for (const e of chartRows) {
    const label = (e.reason && ENQUIRY_REASON_LABELS[e.reason]) || "Other";
    reasonCounts.set(label, (reasonCounts.get(label) || 0) + 1);
  }
  const reasonSegments = Array.from(reasonCounts.entries()).map(([name, value]) => ({
    name,
    value,
    color: REASON_COLORS[name] || "oklch(0.6 0.18 15)",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquiries"
        description="All enquiries across brokers. Use filters to narrow by reason or broker."
      />

      {/* ── Charts ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ChartBarEnquiries data={enquiriesChartData} />
        <ChartDonut
          title="Enquiries by reason"
          segments={reasonSegments}
        />
      </div>

      <EnquiriesClientView
        enquiries={enquiries}
        brokerOptions={brokerOptions}
      />
    </div>
  );
}
