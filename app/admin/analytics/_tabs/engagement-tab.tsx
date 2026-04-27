import { Eye, Inbox, Phone, Send, ShieldCheck } from "lucide-react";
import type { AdminAnalytics } from "@/lib/types/admin-analytics";
import { KpiCard } from "@/components/admin/analytics/kpi-card";
import { AreaTrendChart } from "@/components/admin/analytics/area-trend-chart";
import { DonutChart } from "@/components/admin/analytics/donut-chart";
import { TableSection } from "@/components/admin/analytics/table-section";
import { RecentEnquiriesTable } from "../_tables/recent-enquiries-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function EngagementTab({ analytics }: { analytics: AdminAnalytics }) {
  const { kpis, charts } = analytics;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Total views"
          value={kpis.totalViews.toLocaleString("en-AU")}
          subValue={`${kpis.viewsLast30Days.toLocaleString("en-AU")} in last 30d`}
          current={kpis.viewsLast30Days}
          previous={kpis.viewsPrev30Days}
          icon={<Eye className="h-4 w-4" />}
          tone="primary"
        />
        <KpiCard
          label="Enquiries"
          value={kpis.totalEnquiries.toLocaleString("en-AU")}
          subValue={`${kpis.enquiriesLast30Days} in last 30d`}
          current={kpis.enquiriesLast30Days}
          previous={kpis.enquiriesPrev30Days}
          icon={<Inbox className="h-4 w-4" />}
          tone="amber"
        />
        <KpiCard
          label="Call clicks"
          value={kpis.totalCalls.toLocaleString("en-AU")}
          subValue={`${kpis.callsLast30Days} in last 30d`}
          icon={<Phone className="h-4 w-4" />}
        />
        <KpiCard
          label="NDAs signed"
          value={kpis.totalNDASignatures.toLocaleString("en-AU")}
          subValue={`${kpis.ndaLast30Days} in last 30d`}
          icon={<ShieldCheck className="h-4 w-4" />}
          tone="emerald"
        />
        <KpiCard
          label="View → enquiry"
          value={`${(kpis.viewToEnquiryRate * 100).toFixed(2)}%`}
          subValue="Conversion"
          icon={<Send className="h-4 w-4" />}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaTrendChart
          title="Views, last 12 months"
          description="Listing detail-page views over time."
          data={charts.viewsByMonth}
          color="hsl(189, 94%, 43%)"
          seriesLabel="Views"
          valueKind="count"
          height={240}
        />
        <AreaTrendChart
          title="Enquiries, last 12 months"
          description="Buyer enquiries received per month."
          data={charts.enquiriesByMonth}
          color="hsl(45, 100%, 51%)"
          seriesLabel="Enquiries"
          valueKind="count"
          height={240}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DonutChart
          title="Views by platform"
          data={charts.viewsByPlatform}
          colors={{ web: "var(--primary)", mobile: "hsl(45, 100%, 51%)" }}
          totalLabel="Views"
          height={220}
        />
        <DonutChart
          title="Calls by platform"
          data={charts.callsByPlatform}
          colors={{ web: "var(--primary)", mobile: "hsl(45, 100%, 51%)" }}
          totalLabel="Calls"
          height={220}
        />
        <AreaTrendChart
          title="NDA signatures"
          description="Buyers accepting NDAs each month."
          data={charts.ndaSignaturesByMonth}
          color="hsl(160, 84%, 39%)"
          seriesLabel="NDAs"
          valueKind="count"
          height={220}
        />
      </section>

      <ShareInviteFunnel
        sent={kpis.totalShareInvites}
        opened={kpis.shareInvitesOpened}
        ndaSigned={kpis.shareInvitesNDASigned}
        accountCreated={kpis.shareInvitesAccountCreated}
      />

      <TableSection
        title="Recent enquiries"
        description="Latest buyer enquiries across the platform. Search by contact or listing."
      >
        <RecentEnquiriesTable data={charts.recentEnquiries} />
      </TableSection>
    </div>
  );
}

function ShareInviteFunnel({
  sent,
  opened,
  ndaSigned,
  accountCreated,
}: {
  sent: number;
  opened: number;
  ndaSigned: number;
  accountCreated: number;
}) {
  const stages = [
    { label: "Invites sent", value: sent, color: "var(--primary)" },
    {
      label: "Opened",
      value: opened,
      color: "hsl(189, 94%, 43%)",
      pct: sent > 0 ? (opened / sent) * 100 : 0,
    },
    {
      label: "NDA signed",
      value: ndaSigned,
      color: "hsl(45, 100%, 51%)",
      pct: sent > 0 ? (ndaSigned / sent) * 100 : 0,
    },
    {
      label: "Account created",
      value: accountCreated,
      color: "hsl(160, 84%, 39%)",
      pct: sent > 0 ? (accountCreated / sent) * 100 : 0,
    },
  ];
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Share invite funnel
        </CardTitle>
        <CardDescription className="text-xs">
          External invites brokers send to buyers, stage by stage.
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-5 space-y-4">
        {stages.map((stage) => {
          const widthPct = (stage.value / max) * 100;
          return (
            <div key={stage.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{stage.label}</span>
                <span className="flex items-center gap-2 text-xs">
                  <span className="font-semibold tabular-nums">
                    {stage.value.toLocaleString("en-AU")}
                  </span>
                  {"pct" in stage && stage.pct !== undefined && (
                    <span className="text-muted-foreground tabular-nums">
                      ({stage.pct.toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all")}
                  style={{
                    width: `${Math.max(widthPct, stage.value > 0 ? 2 : 0)}%`,
                    background: stage.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
