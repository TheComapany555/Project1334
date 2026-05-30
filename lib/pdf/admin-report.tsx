// PDF report for the admin platform analytics (Feature #5).

import {
  Document,
  CoverPage,
  ReportPage,
  Section,
  KpiGrid,
  DataTable,
  Text,
  styles,
  formatNumber,
  formatCurrencyCents,
  formatDate,
  formatPercent,
  formatRate01,
  type KpiItem,
  type DataTableColumn,
} from "@/lib/pdf/shared";
import type {
  AdminAnalytics,
  AnalyticsKPIs,
  AnalyticsCharts,
  RevenueTimePoint,
  TimePoint,
  Segment,
  TopListing,
  TopBroker,
  TopAgency,
  RecentPayment,
  RecentEnquiry,
  TopCategory,
} from "@/lib/types/admin-analytics";

export type AdminReportSection =
  | "overview"
  | "revenue"
  | "listings"
  | "engagement"
  | "users"
  | "marketing";

export type AdminReportInput = {
  data: AdminAnalytics;
  sections?: AdminReportSection[];
  generatedAt?: Date;
};

const REPORT_TITLE = "Platform Analytics Report";

const ALL_SECTIONS: AdminReportSection[] = [
  "overview",
  "revenue",
  "listings",
  "engagement",
  "users",
  "marketing",
];

export function AdminAnalyticsReport({
  data,
  sections = ALL_SECTIONS,
  generatedAt = new Date(),
}: AdminReportInput) {
  const include = (s: AdminReportSection) => sections.includes(s);

  return (
    <Document
      title={REPORT_TITLE}
      author="Salebiz"
      creator="Salebiz Analytics"
      producer="Salebiz Analytics"
      subject="Platform-wide analytics, revenue, engagement and users."
    >
      <CoverPage
        title={REPORT_TITLE}
        subtitle="Platform-wide metrics across revenue, listings, engagement and users."
        meta={[
          { label: "Report scope", value: "Salebiz platform (all agencies)" },
          { label: "Time window", value: "Last 12 months" },
          {
            label: "Active subscriptions",
            value: formatNumber(data.kpis.activeSubscriptions),
          },
          {
            label: "Published listings",
            value: formatNumber(data.kpis.publishedListings),
          },
        ]}
        generatedAt={generatedAt}
      />

      <ReportPage reportTitle={REPORT_TITLE}>
        {include("overview") && <OverviewSection kpis={data.kpis} />}
        {include("revenue") && <RevenueSection charts={data.charts} kpis={data.kpis} />}
        {include("listings") && <ListingsSection charts={data.charts} />}
        {include("engagement") && (
          <EngagementSection charts={data.charts} kpis={data.kpis} />
        )}
        {include("users") && <UsersSection charts={data.charts} kpis={data.kpis} />}
        {include("marketing") && <MarketingSection charts={data.charts} />}
      </ReportPage>
    </Document>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview                                                            */
/* ------------------------------------------------------------------ */

function OverviewSection({ kpis }: { kpis: AnalyticsKPIs }) {
  const revenueDelta = percentDelta(
    kpis.revenueLast30Days,
    kpis.revenuePrev30Days,
  );
  const listingsDelta = percentDelta(
    kpis.newListingsLast30Days,
    kpis.newListingsPrev30Days,
  );
  const enquiriesDelta = percentDelta(
    kpis.enquiriesLast30Days,
    kpis.enquiriesPrev30Days,
  );

  const items: KpiItem[] = [
    {
      label: "Revenue (30d)",
      value: formatCurrencyCents(kpis.revenueLast30Days),
      delta: revenueDelta != null ? { value: revenueDelta } : null,
    },
    { label: "MRR", value: formatCurrencyCents(kpis.mrr) },
    {
      label: "Published listings",
      value: formatNumber(kpis.publishedListings),
    },
    {
      label: "Enquiries (30d)",
      value: formatNumber(kpis.enquiriesLast30Days),
      delta: enquiriesDelta != null ? { value: enquiriesDelta } : null,
    },
    {
      label: "New listings (30d)",
      value: formatNumber(kpis.newListingsLast30Days),
      delta: listingsDelta != null ? { value: listingsDelta } : null,
    },
    { label: "Views (30d)", value: formatNumber(kpis.viewsLast30Days) },
    { label: "Calls (30d)", value: formatNumber(kpis.callsLast30Days) },
    { label: "NDA signed (30d)", value: formatNumber(kpis.ndaLast30Days) },
    {
      label: "View → enquiry",
      value: formatRate01(kpis.viewToEnquiryRate, 2),
    },
  ];

  return (
    <Section title="Overview" subtitle="Key platform metrics for the last 30 days.">
      <KpiGrid items={items} />
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Revenue                                                            */
/* ------------------------------------------------------------------ */

function RevenueSection({
  charts,
  kpis,
}: {
  charts: AnalyticsCharts;
  kpis: AnalyticsKPIs;
}) {
  const summary: KpiItem[] = [
    {
      label: "Total revenue",
      value: formatCurrencyCents(kpis.totalRevenue),
    },
    {
      label: "Active subscriptions",
      value: formatNumber(kpis.activeSubscriptions),
    },
    {
      label: "Trialing",
      value: formatNumber(kpis.trialingSubscriptions),
    },
    {
      label: "Past due",
      value: formatNumber(kpis.pastDueSubscriptions),
    },
    {
      label: "Cancelled (30d)",
      value: formatNumber(kpis.cancelledLast30Days),
    },
    {
      label: "Discounts savings",
      value: formatCurrencyCents(kpis.totalDiscountSavings),
    },
  ];

  return (
    <>
      <Section title="Revenue summary" subtitle="Subscription health and discount totals." break>
        <KpiGrid items={summary} />
      </Section>

      <Section title="Revenue by month" subtitle="Last 12 months. Includes all paid items.">
        <RevenueByMonthTable rows={charts.revenueByMonth} />
      </Section>

      <Section title="Revenue by payment type">
        <SegmentTable rows={charts.revenueByPaymentType} withAmount />
      </Section>

      <Section title="Recent payments">
        <RecentPaymentsTable rows={charts.recentPayments} />
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Listings                                                           */
/* ------------------------------------------------------------------ */

function ListingsSection({ charts }: { charts: AnalyticsCharts }) {
  return (
    <>
      <Section title="Top listings by enquiries" break>
        <TopListingsTable rows={charts.topListingsByEnquiries} sortBy="enquiries" />
      </Section>

      <Section title="Top listings by views">
        <TopListingsTable rows={charts.topListingsByViews} sortBy="views" />
      </Section>

      <Section title="Top categories">
        <TopCategoriesTable rows={charts.topCategories} />
      </Section>

      <Section title="New listings by month">
        <TimeseriesTable rows={charts.newListingsByMonth} valueLabel="New listings" />
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Engagement                                                         */
/* ------------------------------------------------------------------ */

function EngagementSection({
  charts,
  kpis,
}: {
  charts: AnalyticsCharts;
  kpis: AnalyticsKPIs;
}) {
  const summary: KpiItem[] = [
    { label: "Total views", value: formatNumber(kpis.totalViews) },
    { label: "Total enquiries", value: formatNumber(kpis.totalEnquiries) },
    { label: "Total calls", value: formatNumber(kpis.totalCalls) },
    { label: "Total NDA signed", value: formatNumber(kpis.totalNDASignatures) },
    { label: "Share invites", value: formatNumber(kpis.totalShareInvites) },
    {
      label: "Invites → NDA signed",
      value: formatNumber(kpis.shareInvitesNDASigned),
    },
  ];

  return (
    <>
      <Section title="Engagement totals" break>
        <KpiGrid items={summary} />
      </Section>

      <Section title="Enquiries by month">
        <TimeseriesTable rows={charts.enquiriesByMonth} valueLabel="Enquiries" />
      </Section>

      <Section title="Views by platform">
        <SegmentTable rows={charts.viewsByPlatform} />
      </Section>

      <Section title="Recent enquiries">
        <RecentEnquiriesTable rows={charts.recentEnquiries} />
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Users                                                              */
/* ------------------------------------------------------------------ */

function UsersSection({
  charts,
  kpis,
}: {
  charts: AnalyticsCharts;
  kpis: AnalyticsKPIs;
}) {
  const summary: KpiItem[] = [
    { label: "Total agencies", value: formatNumber(kpis.totalAgencies) },
    { label: "Active agencies", value: formatNumber(kpis.activeAgencies) },
    {
      label: "New agencies (30d)",
      value: formatNumber(kpis.newAgenciesLast30Days),
    },
    { label: "Total brokers", value: formatNumber(kpis.totalBrokers) },
    { label: "Active brokers", value: formatNumber(kpis.activeBrokers) },
  ];

  return (
    <>
      <Section title="User base" break>
        <KpiGrid items={summary} />
      </Section>

      <Section title="New agencies by month">
        <TimeseriesTable rows={charts.newAgenciesByMonth} valueLabel="Agencies" />
      </Section>

      <Section title="Top agencies by revenue">
        <TopAgenciesTable rows={charts.topAgencies} />
      </Section>

      <Section title="Top brokers by enquiries">
        <TopBrokersTable rows={charts.topBrokers} />
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Marketing                                                          */
/* ------------------------------------------------------------------ */

function MarketingSection({ charts }: { charts: AnalyticsCharts }) {
  return (
    <>
      <Section title="Top discount codes" break>
        <DiscountCodesTable rows={charts.topDiscountCodes} />
      </Section>

      <Section title="Ads by placement">
        <AdsByPlacementTable rows={charts.adsByPlacement} />
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Reusable table renderers                                           */
/* ------------------------------------------------------------------ */

function RevenueByMonthTable({ rows }: { rows: RevenueTimePoint[] }) {
  const columns: DataTableColumn<RevenueTimePoint>[] = [
    { header: "Month", width: "30%", cell: (r) => r.month },
    {
      header: "Revenue",
      width: "35%",
      align: "right",
      cell: (r) => formatCurrencyCents(r.revenue),
    },
    {
      header: "Payments",
      align: "right",
      cell: (r) => formatNumber(r.count),
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyMessage="No revenue recorded in the last 12 months."
    />
  );
}

function TimeseriesTable({
  rows,
  valueLabel,
}: {
  rows: TimePoint[];
  valueLabel: string;
}) {
  const columns: DataTableColumn<TimePoint>[] = [
    { header: "Month", width: "60%", cell: (r) => r.month },
    {
      header: valueLabel,
      align: "right",
      cell: (r) => formatNumber(r.value),
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyMessage="No data for this period."
    />
  );
}

function SegmentTable({
  rows,
  withAmount = false,
}: {
  rows: Segment[];
  withAmount?: boolean;
}) {
  const columns: DataTableColumn<Segment>[] = [
    { header: "Segment", width: "50%", cell: (r) => r.label },
    {
      header: withAmount ? "Count" : "Count",
      align: "right",
      cell: (r) => formatNumber(r.count),
    },
    ...(withAmount
      ? ([
          {
            header: "Amount",
            align: "right",
            cell: (r: Segment) => formatCurrencyCents(r.amount ?? null),
          },
        ] as DataTableColumn<Segment>[])
      : []),
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyMessage="No segments to display."
    />
  );
}

function TopListingsTable({
  rows,
  sortBy,
}: {
  rows: TopListing[];
  sortBy: "enquiries" | "views";
}) {
  const columns: DataTableColumn<TopListing>[] = [
    { header: "Listing", width: "44%", cell: (r) => r.title },
    {
      header: "Agency",
      width: "26%",
      cell: (r) => r.agencyName ?? "—",
    },
    {
      header: "Views",
      width: "15%",
      align: "right",
      cell: (r) => formatNumber(r.views),
    },
    {
      header: "Enquiries",
      align: "right",
      cell: (r) => formatNumber(r.enquiries),
    },
  ];
  const sorted = [...rows].sort((a, b) =>
    sortBy === "views" ? b.views - a.views : b.enquiries - a.enquiries,
  );
  return (
    <DataTable
      columns={columns}
      rows={sorted}
      emptyMessage="No listings to display."
    />
  );
}

function TopCategoriesTable({ rows }: { rows: TopCategory[] }) {
  const columns: DataTableColumn<TopCategory>[] = [
    { header: "Category", width: "60%", cell: (r) => r.name },
    {
      header: "Listings",
      width: "20%",
      align: "right",
      cell: (r) => formatNumber(r.listings),
    },
    {
      header: "Enquiries",
      align: "right",
      cell: (r) => formatNumber(r.enquiries),
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyMessage="No category data."
    />
  );
}

function TopBrokersTable({ rows }: { rows: TopBroker[] }) {
  const columns: DataTableColumn<TopBroker>[] = [
    {
      header: "Broker",
      width: "32%",
      cell: (r) => r.name ?? r.email ?? "—",
    },
    {
      header: "Agency",
      width: "32%",
      cell: (r) => r.agencyName ?? "—",
    },
    {
      header: "Listings",
      width: "16%",
      align: "right",
      cell: (r) => formatNumber(r.listings),
    },
    {
      header: "Enquiries",
      align: "right",
      cell: (r) => formatNumber(r.enquiries),
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyMessage="No broker data."
    />
  );
}

function TopAgenciesTable({ rows }: { rows: TopAgency[] }) {
  const columns: DataTableColumn<TopAgency>[] = [
    { header: "Agency", width: "40%", cell: (r) => r.name },
    {
      header: "Brokers",
      width: "15%",
      align: "right",
      cell: (r) => formatNumber(r.brokers),
    },
    {
      header: "Listings",
      width: "15%",
      align: "right",
      cell: (r) => formatNumber(r.listings),
    },
    {
      header: "Revenue",
      align: "right",
      cell: (r) => formatCurrencyCents(r.revenue),
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyMessage="No agency data."
    />
  );
}

function RecentPaymentsTable({ rows }: { rows: RecentPayment[] }) {
  const columns: DataTableColumn<RecentPayment>[] = [
    { header: "Date", width: "18%", cell: (r) => formatDate(r.createdAt) },
    {
      header: "Agency",
      width: "26%",
      cell: (r) => r.agencyName ?? "—",
    },
    {
      header: "Product",
      width: "26%",
      cell: (r) => r.productName ?? "—",
    },
    {
      header: "Status",
      width: "15%",
      cell: (r) => r.status,
    },
    {
      header: "Amount",
      align: "right",
      cell: (r) => formatCurrencyCents(r.amount),
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyMessage="No recent payments."
    />
  );
}

function RecentEnquiriesTable({ rows }: { rows: RecentEnquiry[] }) {
  const columns: DataTableColumn<RecentEnquiry>[] = [
    { header: "Date", width: "22%", cell: (r) => formatDate(r.createdAt) },
    {
      header: "Contact",
      width: "26%",
      cell: (r) => r.contactName ?? r.contactEmail ?? "—",
    },
    {
      header: "Email",
      width: "26%",
      cell: (r) => r.contactEmail ?? "—",
    },
    {
      header: "Listing",
      cell: (r) => r.listingTitle ?? "—",
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyMessage="No recent enquiries."
    />
  );
}

function DiscountCodesTable({
  rows,
}: {
  rows: AnalyticsCharts["topDiscountCodes"];
}) {
  if (!rows.length) {
    return (
      <Text style={styles.empty}>No discount codes have been redeemed yet.</Text>
    );
  }
  type Row = AnalyticsCharts["topDiscountCodes"][number];
  const columns: DataTableColumn<Row>[] = [
    { header: "Code", width: "30%", cell: (r) => r.code },
    {
      header: "% off",
      width: "20%",
      align: "right",
      cell: (r) => formatPercent(r.percentOff, 0),
    },
    {
      header: "Redemptions",
      width: "25%",
      align: "right",
      cell: (r) => formatNumber(r.redemptions),
    },
    {
      header: "Cap",
      align: "right",
      cell: (r) => (r.maxUses == null ? "∞" : formatNumber(r.maxUses)),
    },
  ];
  return <DataTable columns={columns} rows={rows} />;
}

function AdsByPlacementTable({
  rows,
}: {
  rows: AnalyticsCharts["adsByPlacement"];
}) {
  if (!rows.length) {
    return <Text style={styles.empty}>No active ad placements.</Text>;
  }
  type Row = AnalyticsCharts["adsByPlacement"][number];
  const columns: DataTableColumn<Row>[] = [
    { header: "Placement", width: "22%", cell: (r) => r.placement },
    {
      header: "Active ads",
      width: "18%",
      align: "right",
      cell: (r) => formatNumber(r.activeAds),
    },
    {
      header: "Impressions",
      width: "20%",
      align: "right",
      cell: (r) => formatNumber(r.impressions),
    },
    {
      header: "Clicks",
      width: "15%",
      align: "right",
      cell: (r) => formatNumber(r.clicks),
    },
    {
      header: "CTR",
      align: "right",
      cell: (r) => formatRate01(r.ctr, 2),
    },
  ];
  return <DataTable columns={columns} rows={rows} />;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function percentDelta(current: number, prev: number): number | null {
  if (prev === 0) return current > 0 ? 100 : null;
  return ((current - prev) / prev) * 100;
}
