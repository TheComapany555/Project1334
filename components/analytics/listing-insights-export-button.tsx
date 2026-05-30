"use client";

// Wires the generic ExportPdfDialog to the listing insights PDF report.
// Lets the user pick a period (7/30/90) and which sections to include.

import { toast } from "sonner";
import {
  ExportPdfDialog,
  type ExportSection,
} from "@/components/analytics/export-pdf-dialog";
import { getListingInsightsMetrics } from "@/lib/actions/listing-insights";
// Lazy-load @react-pdf inside the handler — see comment in
// broker-analytics-export-button.tsx for the rationale.
import type { ListingReportSection } from "@/lib/pdf/listing-report";

type Props = {
  listingId: string;
  defaultPeriodDays: 7 | 30 | 90;
};

const SECTIONS: ExportSection<ListingReportSection>[] = [
  { key: "kpis", label: "Engagement summary", description: "Views, enquiries, calls, NDA, saves, documents." },
  { key: "hot_buyers", label: "Hot buyers", description: "Buyers showing the strongest signals on this listing." },
  { key: "feedback", label: "Recent feedback", description: "Logged objections, concerns and questions from buyers." },
];

const PERIODS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export function ListingInsightsExportButton({
  listingId,
  defaultPeriodDays,
}: Props) {
  return (
    <ExportPdfDialog
      title="Export listing insights"
      description="A branded PDF report with this listing's signals and feedback."
      sections={SECTIONS}
      periodOptions={PERIODS}
      defaultPeriod={defaultPeriodDays}
      triggerLabel="Export PDF"
      onExport={async ({ sections, periodDays }) => {
        const days = (periodDays ?? defaultPeriodDays) as 7 | 30 | 90;
        const [{ downloadPdf, pdfFilename }, { ListingInsightsReport }, insights] =
          await Promise.all([
            import("@/lib/pdf/download"),
            import("@/lib/pdf/listing-report"),
            getListingInsightsMetrics(listingId, days),
          ]);
        const filename = pdfFilename({
          title: "Listing insights",
          subject: insights.listing.title,
          suffix: `${days}d`,
        });
        await downloadPdf(
          <ListingInsightsReport insights={insights} sections={sections} />,
          filename,
        );
        toast.success(`Saved ${filename}`);
      }}
    />
  );
}
