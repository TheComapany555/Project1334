"use client";

// Wires the generic ExportPdfDialog to the broker analytics report. The
// dialog lets the user pick a period (matching the dashboard's own 7/30/90
// tabs) and toggle sections. On submit, this component fetches a fresh
// snapshot for the chosen period and triggers the download.

import { toast } from "sonner";
import {
  ExportPdfDialog,
  type ExportSection,
} from "@/components/analytics/export-pdf-dialog";
import { getBrokerAnalytics } from "@/lib/actions/analytics";
// `@react-pdf/renderer` is ~500 KB minified — lazy-load it inside the click
// handler so it stays out of every analytics-page initial bundle. The
// `BrokerReportSection` import is types-only (stripped at build).
import type { BrokerReportSection } from "@/lib/pdf/broker-report";

type Props = {
  /** Default period (matches the dashboard's currently-selected tab). */
  defaultPeriodDays: 7 | 30 | 90;
  /** Owner name printed on the cover page (broker or agency). */
  ownerLabel: string;
  /** Optional second line on the cover page (agency name when owner = broker). */
  ownerSubLabel?: string;
};

const SECTIONS: ExportSection<BrokerReportSection>[] = [
  { key: "kpis", label: "Key metrics", description: "Views, enquiries, engagement, calls, saves." },
  { key: "platform", label: "Platform split", description: "Web vs mobile share of views." },
  { key: "funnel", label: "Engagement funnel", description: "Views → saves → enquiries → calls → NDA." },
  { key: "trends", label: "Daily activity", description: "Per-day breakdown of views and enquiries." },
  { key: "per_listing", label: "Listings table", description: "All listings with views, enquiries, calls, NDAs." },
];

const PERIODS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export function BrokerAnalyticsExportButton({
  defaultPeriodDays,
  ownerLabel,
  ownerSubLabel,
}: Props) {
  return (
    <ExportPdfDialog
      title="Export analytics PDF"
      description="A branded PDF report with the metrics on this dashboard."
      sections={SECTIONS}
      periodOptions={PERIODS}
      defaultPeriod={defaultPeriodDays}
      onExport={async ({ sections, periodDays }) => {
        const days = (periodDays ?? defaultPeriodDays) as 7 | 30 | 90;
        const [{ downloadPdf, pdfFilename }, { BrokerAnalyticsReport }, overview] =
          await Promise.all([
            import("@/lib/pdf/download"),
            import("@/lib/pdf/broker-report"),
            getBrokerAnalytics(days),
          ]);
        const filename = pdfFilename({
          title: "Broker analytics",
          subject: ownerLabel,
          suffix: `${days}d`,
        });
        await downloadPdf(
          <BrokerAnalyticsReport
            overview={overview}
            ownerLabel={ownerLabel}
            ownerSubLabel={ownerSubLabel}
            sections={sections}
          />,
          filename,
        );
        toast.success(`Saved ${filename}`);
      }}
    />
  );
}
