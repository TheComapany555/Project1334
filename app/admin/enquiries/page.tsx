import { getAllEnquiries } from "@/lib/actions/enquiries";
import { getBrokersForAdmin } from "@/lib/actions/admin-brokers";
import { ENQUIRY_REASON_LABELS } from "@/lib/types/enquiries";
import { buildEnquiriesChartData } from "@/lib/chart-data";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Pagination } from "@/components/admin/pagination";
import { ChartBarEnquiries } from "@/components/admin/chart-bar-enquiries";
import { ChartDonut } from "@/components/admin/chart-donut";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EnquiriesTable } from "./enquiries-table";
import { EnquiriesFilterBar } from "./enquiries-filter-bar";
import { Inbox } from "lucide-react";

const PAGE_SIZE = 20;

const REASON_COLORS: Record<string, string> = {
  "General enquiry": "oklch(0.45 0.12 155)",
  "Request viewing": "oklch(0.55 0.14 220)",
  "Make an offer": "oklch(0.7 0.15 75)",
  Other: "oklch(0.55 0.15 290)",
};

type Props = { searchParams: Promise<{ page?: string; reason?: string; broker_id?: string }> };

export default async function AdminEnquiriesPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const reason = params.reason?.trim() || null;
  const broker_id = params.broker_id?.trim() || null;

  const [brokers, { enquiries, total }, { enquiries: allEnquiries }] = await Promise.all([
    getBrokersForAdmin(),
    getAllEnquiries({ page, pageSize: PAGE_SIZE, reason, broker_id }),
    getAllEnquiries({ page: 1, pageSize: 500 }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const brokerOptions = brokers.map((b) => ({
    value: b.id,
    label: b.name || b.company || b.email || b.id,
  }));

  // Chart data
  const enquiriesChartData = buildEnquiriesChartData(
    allEnquiries.map((e) => ({ created_at: e.created_at }))
  );

  const reasonCounts = new Map<string, number>();
  for (const e of allEnquiries) {
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

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/30 px-4 py-4 sm:px-6">
          <div className="space-y-4">
            <div>
              <CardTitle className="text-base">All enquiries</CardTitle>
              <CardDescription className="mt-0.5">
                {total === 0
                  ? "No enquiries yet."
                  : `${total} enquiry${total === 1 ? "" : "ies"} total`}
              </CardDescription>
            </div>
            <EnquiriesFilterBar brokerOptions={brokerOptions} />
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {enquiries.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No enquiries"
              description="Enquiries will appear here when buyers contact brokers from listing pages. Try changing the filters."
            />
          ) : (
            <>
              <EnquiriesTable enquiries={enquiries} page={page} totalPages={totalPages} />
              <Pagination
                page={page}
                totalPages={totalPages}
                basePath="/admin/enquiries"
                searchParams={{
                  ...(reason && { reason }),
                  ...(broker_id && { broker_id }),
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
