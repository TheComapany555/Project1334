// PDF report for the per-listing insights page (Feature #5).

import {
  Document,
  CoverPage,
  ReportPage,
  Section,
  KpiGrid,
  DataTable,
  View,
  Text,
  styles,
  formatNumber,
  formatCurrencyCents,
  formatDate,
  type KpiItem,
  type DataTableColumn,
} from "@/lib/pdf/shared";
import { PDF_COLORS } from "@/lib/pdf/theme";
import type {
  ListingInsightsMetrics,
  HotBuyer,
  HotBuyerSignal,
} from "@/lib/actions/listing-insights";
import type { ListingFeedbackRow, FeedbackSubtype } from "@/lib/actions/crm";

export type ListingReportSection = "kpis" | "hot_buyers" | "feedback";

export type ListingReportInput = {
  insights: ListingInsightsMetrics;
  sections?: ListingReportSection[];
  generatedAt?: Date;
};

const REPORT_TITLE = "Listing Insights Report";

const ALL_SECTIONS: ListingReportSection[] = ["kpis", "hot_buyers", "feedback"];

const SIGNAL_LABEL: Record<HotBuyerSignal, string> = {
  multiple_visits: "Multiple visits",
  nda_requested: "NDA requested",
  nda_signed: "NDA signed",
  saved: "Saved",
};

const FEEDBACK_LABEL: Record<FeedbackSubtype, string> = {
  feedback: "Feedback",
  objection: "Objection",
  concern: "Concern",
  lost_interest: "Lost interest",
  common_question: "Common question",
};

export function ListingInsightsReport({
  insights,
  sections = ALL_SECTIONS,
  generatedAt = new Date(),
}: ListingReportInput) {
  const include = (s: ListingReportSection) => sections.includes(s);
  const periodLabel = `Last ${insights.period_days} days`;
  const locationLine = [insights.listing.suburb, insights.listing.state]
    .filter(Boolean)
    .join(", ");
  const reportSubtitle = `${insights.listing.title} · ${periodLabel}`;

  return (
    <Document
      title={`${REPORT_TITLE} — ${insights.listing.title}`}
      author="Salebiz"
      creator="Salebiz Analytics"
      producer="Salebiz Analytics"
      subject={`Listing analytics for "${insights.listing.title}" (${periodLabel})`}
    >
      <CoverPage
        title={REPORT_TITLE}
        subtitle="Buyer signals and engagement for this listing."
        meta={[
          { label: "Listing", value: insights.listing.title },
          ...(insights.listing.category
            ? [{ label: "Category", value: insights.listing.category }]
            : []),
          ...(locationLine
            ? [{ label: "Location", value: locationLine }]
            : []),
          {
            label: "Asking price",
            value:
              insights.listing.price_type === "poa"
                ? "Price on application"
                : formatCurrencyCents(
                    insights.listing.asking_price != null
                      ? insights.listing.asking_price * 100
                      : null,
                  ),
          },
          { label: "Period", value: periodLabel },
          {
            label: "Days live",
            value: insights.metrics.days_live > 0
              ? String(insights.metrics.days_live)
              : "—",
          },
        ]}
        generatedAt={generatedAt}
      />

      <ReportPage reportTitle={REPORT_TITLE} reportSubtitle={reportSubtitle}>
        {include("kpis") && <KpisSection metrics={insights.metrics} />}
        {include("hot_buyers") && <HotBuyersSection buyers={insights.hot_buyers} />}
        {include("feedback") && (
          <FeedbackSection feedback={insights.recent_feedback} />
        )}
      </ReportPage>
    </Document>
  );
}

/* ------------------------------------------------------------------ */
/*  Sections                                                           */
/* ------------------------------------------------------------------ */

function KpisSection({
  metrics,
}: {
  metrics: ListingInsightsMetrics["metrics"];
}) {
  const items: KpiItem[] = [
    { label: "Total views", value: formatNumber(metrics.total_views) },
    { label: "Unique visitors", value: formatNumber(metrics.unique_visitors) },
    { label: "Repeat visitors", value: formatNumber(metrics.repeat_visitors) },
    { label: "Enquiries", value: formatNumber(metrics.enquiries) },
    { label: "Calls", value: formatNumber(metrics.calls) },
    { label: "Saved by buyers", value: formatNumber(metrics.saved_listings) },
    { label: "NDA requests", value: formatNumber(metrics.nda_requests) },
    { label: "NDA signed", value: formatNumber(metrics.nda_signed) },
    { label: "Documents viewed", value: formatNumber(metrics.documents_viewed) },
  ];

  return (
    <Section title="Engagement summary" subtitle="Activity across the selected period.">
      <KpiGrid items={items} />
    </Section>
  );
}

function HotBuyersSection({ buyers }: { buyers: HotBuyer[] }) {
  const columns: DataTableColumn<HotBuyer>[] = [
    {
      header: "Buyer",
      width: "28%",
      cell: (b) => b.name || b.email || "Anonymous",
    },
    { header: "Email", width: "26%", cell: (b) => b.email ?? "—" },
    {
      header: "Visits",
      width: "10%",
      align: "right",
      cell: (b) => formatNumber(b.visit_count),
    },
    {
      header: "Signals",
      width: "20%",
      cell: (b) =>
        b.signals.length === 0
          ? "—"
          : b.signals.map((s) => SIGNAL_LABEL[s]).join(", "),
    },
    {
      header: "Last activity",
      cell: (b) =>
        b.last_activity_at ? formatDate(b.last_activity_at) : "—",
    },
  ];

  return (
    <Section
      title="Hot buyers"
      subtitle="Buyers showing the strongest signals on this listing."
    >
      <DataTable
        columns={columns}
        rows={buyers}
        emptyMessage="No hot buyer signals in this period."
      />
    </Section>
  );
}

function FeedbackSection({ feedback }: { feedback: ListingFeedbackRow[] }) {
  if (feedback.length === 0) {
    return (
      <Section
        title="Recent buyer feedback"
        subtitle="Logged objections, questions and feedback from buyers."
      >
        <Text style={styles.empty}>No feedback recorded for this period.</Text>
      </Section>
    );
  }

  return (
    <Section
      title="Recent buyer feedback"
      subtitle="Logged objections, questions and feedback from buyers."
      break
    >
      {feedback.map((row) => (
        <View
          key={row.activity_id}
          wrap={false}
          style={{
            marginBottom: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: PDF_COLORS.divider,
            borderRadius: 4,
            backgroundColor: "#ffffff",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <Text
              style={{
                fontSize: 8,
                fontFamily: "Helvetica-Bold",
                color: PDF_COLORS.brand,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              {FEEDBACK_LABEL[row.subtype]}
            </Text>
            <Text style={{ fontSize: 8, color: PDF_COLORS.textMuted }}>
              {row.buyer_name || row.buyer_email || "Anonymous"} ·{" "}
              {formatDate(row.occurred_at)}
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: PDF_COLORS.text, lineHeight: 1.5 }}>
            {row.body}
          </Text>
        </View>
      ))}
    </Section>
  );
}
