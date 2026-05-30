// PDF report for the broker analytics dashboard (Feature #5).

import {
  Document,
  CoverPage,
  ReportPage,
  Section,
  KpiGrid,
  DataTable,
  type KpiItem,
  type DataTableColumn,
  formatNumber,
  formatPercent,
  formatDate,
} from "@/lib/pdf/shared";
import type {
  AnalyticsOverview,
  DailyViewStat,
  ListingAnalyticsStat,
} from "@/lib/actions/analytics";

export type BrokerReportSection =
  | "kpis"
  | "trends"
  | "platform"
  | "funnel"
  | "per_listing";

export type BrokerReportInput = {
  overview: AnalyticsOverview;
  /** Owner name shown on the cover page (broker or agency name). */
  ownerLabel: string;
  /** Optional second line on the cover page (e.g. agency name when owner is the broker). */
  ownerSubLabel?: string;
  /** Sections to include. If undefined, all sections are included. */
  sections?: BrokerReportSection[];
  generatedAt?: Date;
};

const REPORT_TITLE = "Broker Performance Report";

const ALL_SECTIONS: BrokerReportSection[] = [
  "kpis",
  "trends",
  "platform",
  "funnel",
  "per_listing",
];

export function BrokerAnalyticsReport({
  overview,
  ownerLabel,
  ownerSubLabel,
  sections = ALL_SECTIONS,
  generatedAt = new Date(),
}: BrokerReportInput) {
  const include = (s: BrokerReportSection) => sections.includes(s);
  const periodLabel = `Last ${overview.period_days} days`;
  const reportSubtitle = `${ownerLabel} · ${periodLabel}`;

  return (
    <Document
      title={`${REPORT_TITLE} — ${ownerLabel}`}
      author="Salebiz"
      creator="Salebiz Analytics"
      producer="Salebiz Analytics"
      subject={`Broker analytics for ${ownerLabel} (${periodLabel})`}
    >
      <CoverPage
        title={REPORT_TITLE}
        subtitle="Performance, engagement and listing-level breakdown."
        meta={[
          { label: "Report owner", value: ownerLabel },
          ...(ownerSubLabel
            ? [{ label: "Agency", value: ownerSubLabel }]
            : []),
          { label: "Period", value: periodLabel },
          { label: "Total listings", value: String(overview.per_listing.length) },
        ]}
        generatedAt={generatedAt}
      />

      <ReportPage reportTitle={REPORT_TITLE} reportSubtitle={reportSubtitle}>
        {include("kpis") && <KpisSection overview={overview} />}
        {include("platform") && <PlatformSection overview={overview} />}
        {include("funnel") && <FunnelSection overview={overview} />}
        {include("trends") && <TrendsSection daily={overview.daily} />}
        {include("per_listing") && (
          <PerListingSection listings={overview.per_listing} />
        )}
      </ReportPage>
    </Document>
  );
}

/* ------------------------------------------------------------------ */
/*  Sections                                                           */
/* ------------------------------------------------------------------ */

function KpisSection({ overview }: { overview: AnalyticsOverview }) {
  const items: KpiItem[] = [
    {
      label: "Total views",
      value: formatNumber(overview.total_views),
      delta:
        overview.views_trend != null ? { value: overview.views_trend } : null,
    },
    {
      label: "Enquiries",
      value: formatNumber(overview.enquiries),
      delta:
        overview.enquiries_trend != null
          ? { value: overview.enquiries_trend }
          : null,
    },
    { label: "Engagement", value: formatPercent(overview.engagement_rate) },
    { label: "Calls (period)", value: formatNumber(overview.calls) },
    { label: "Saves (all-time)", value: formatNumber(overview.saves_total) },
    {
      label: "NDA signatures",
      value: formatNumber(overview.nda_sigs_total),
    },
  ];

  return (
    <Section
      title="Key metrics"
      subtitle={`Period: last ${overview.period_days} days. Trend arrows compare to the prior ${overview.period_days}-day period.`}
    >
      <KpiGrid items={items} />
    </Section>
  );
}

function PlatformSection({ overview }: { overview: AnalyticsOverview }) {
  const total = overview.web_views + overview.mobile_views;
  const webPct = total > 0 ? (overview.web_views / total) * 100 : 0;
  const mobilePct = total > 0 ? (overview.mobile_views / total) * 100 : 0;

  type Row = { platform: string; views: number; share: number };
  const rows: Row[] = [
    { platform: "Web", views: overview.web_views, share: webPct },
    { platform: "Mobile", views: overview.mobile_views, share: mobilePct },
  ];

  const columns: DataTableColumn<Row>[] = [
    { header: "Platform", width: "30%", cell: (r) => r.platform },
    {
      header: "Views",
      width: "30%",
      align: "right",
      cell: (r) => formatNumber(r.views),
    },
    {
      header: "Share",
      align: "right",
      cell: (r) => formatPercent(r.share, 0),
    },
  ];

  return (
    <Section title="Platform split" subtitle="Where your views came from.">
      <DataTable columns={columns} rows={rows} />
    </Section>
  );
}

function FunnelSection({ overview }: { overview: AnalyticsOverview }) {
  const steps: { label: string; count: number }[] = [
    { label: "Views", count: overview.total_views },
    { label: "Saves (all-time)", count: overview.saves_total },
    { label: "Enquiries", count: overview.enquiries },
    { label: "Calls", count: overview.calls },
    { label: "NDA signed", count: overview.nda_sigs_total },
  ];

  type Row = {
    label: string;
    count: number;
    conversionFromTop: number | null;
  };
  const top = steps[0].count;
  const rows: Row[] = steps.map((s) => ({
    label: s.label,
    count: s.count,
    conversionFromTop: top > 0 ? (s.count / top) * 100 : null,
  }));

  const columns: DataTableColumn<Row>[] = [
    { header: "Stage", width: "40%", cell: (r) => r.label },
    {
      header: "Count",
      width: "30%",
      align: "right",
      cell: (r) => formatNumber(r.count),
    },
    {
      header: "% of views",
      align: "right",
      cell: (r) => formatPercent(r.conversionFromTop, 1),
    },
  ];

  return (
    <Section
      title="Engagement funnel"
      subtitle="From a view to a signed NDA. Percentages are share of total views."
    >
      <DataTable columns={columns} rows={rows} />
    </Section>
  );
}

function TrendsSection({ daily }: { daily: DailyViewStat[] }) {
  // To keep the table compact we cap to the last ~30 most-recent days. The
  // underlying API may already trim by `period_days`, this is just defensive.
  const trimmed = daily.slice(-30);

  const columns: DataTableColumn<DailyViewStat>[] = [
    { header: "Date", width: "30%", cell: (r) => formatDate(r.date) },
    {
      header: "Web",
      width: "20%",
      align: "right",
      cell: (r) => formatNumber(r.web),
    },
    {
      header: "Mobile",
      width: "20%",
      align: "right",
      cell: (r) => formatNumber(r.mobile),
    },
    {
      header: "Enquiries",
      align: "right",
      cell: (r) => formatNumber(r.enquiries),
    },
  ];

  return (
    <Section
      title="Daily activity"
      subtitle="Daily views split by platform, plus enquiries received."
      break
    >
      <DataTable
        columns={columns}
        rows={trimmed}
        emptyMessage="No daily activity recorded for this period."
      />
    </Section>
  );
}

/**
 * Cap the per-listing table to keep PDF generation responsive — react-pdf's
 * layout/render runs synchronously on the main thread, so a 500-row table
 * stalls the UI noticeably. Top-N by views is what dashboard users
 * primarily care about; the cover page already shows total listings.
 */
const PER_LISTING_PDF_CAP = 100;

function PerListingSection({
  listings,
}: {
  listings: ListingAnalyticsStat[];
}) {
  // Sort by views desc so the most-active listings rise to the top of the
  // table — matches how the dashboard table is typically read.
  const sorted = [...listings].sort((a, b) => b.views - a.views);
  const truncated = sorted.length > PER_LISTING_PDF_CAP;
  const rows = truncated ? sorted.slice(0, PER_LISTING_PDF_CAP) : sorted;

  const columns: DataTableColumn<ListingAnalyticsStat>[] = [
    { header: "Listing", width: "32%", cell: (r) => r.title },
    {
      header: "Views",
      width: "11%",
      align: "right",
      cell: (r) => formatNumber(r.views),
    },
    {
      header: "Enq.",
      width: "9%",
      align: "right",
      cell: (r) => formatNumber(r.enquiries),
    },
    {
      header: "Calls",
      width: "9%",
      align: "right",
      cell: (r) => formatNumber(r.calls),
    },
    {
      header: "Saves",
      width: "9%",
      align: "right",
      cell: (r) => formatNumber(r.saves),
    },
    {
      header: "NDA",
      width: "9%",
      align: "right",
      cell: (r) => formatNumber(r.nda_sigs),
    },
    {
      header: "Engage.",
      align: "right",
      cell: (r) => formatPercent(r.engagement_rate, 1),
    },
  ];

  return (
    <Section
      title={
        truncated
          ? `Top ${PER_LISTING_PDF_CAP} listings (all-time)`
          : "Listings (all-time)"
      }
      subtitle={
        truncated
          ? `Top ${PER_LISTING_PDF_CAP} of ${formatNumber(sorted.length)} listings, sorted by views.`
          : "All listings under this account, sorted by views."
      }
      break
    >
      <DataTable
        columns={columns}
        rows={rows}
        emptyMessage="No listings published yet."
      />
    </Section>
  );
}
