"use client";

// Wires the generic ExportPdfDialog to the admin analytics PDF report.
// Admin analytics has a fixed 12-month window, so no period picker — the
// dialog only offers section toggles.

import { toast } from "sonner";
import {
  ExportPdfDialog,
  type ExportSection,
} from "@/components/analytics/export-pdf-dialog";
import { getAdminAnalytics } from "@/lib/actions/admin-analytics";
// Lazy-load @react-pdf inside the handler — see comment in
// broker-analytics-export-button.tsx for the rationale.
import type { AdminReportSection } from "@/lib/pdf/admin-report";

const SECTIONS: ExportSection<AdminReportSection>[] = [
  { key: "overview", label: "Overview", description: "Headline KPIs across revenue, listings and engagement." },
  { key: "revenue", label: "Revenue", description: "Subscription health, revenue by month, recent payments." },
  { key: "listings", label: "Listings", description: "Top listings, categories, new listings trend." },
  { key: "engagement", label: "Engagement", description: "Enquiries, views, calls, NDA — totals and recent." },
  { key: "users", label: "Users", description: "Agencies and brokers — counts, growth and top performers." },
  { key: "marketing", label: "Marketing", description: "Discount code redemptions and ad placement totals." },
];

export function AdminAnalyticsExportButton() {
  return (
    <ExportPdfDialog
      title="Export platform analytics"
      description="A branded PDF report covering the last 12 months of platform activity."
      sections={SECTIONS}
      triggerLabel="Export PDF"
      onExport={async ({ sections }) => {
        const [{ downloadPdf, pdfFilename }, { AdminAnalyticsReport }, data] =
          await Promise.all([
            import("@/lib/pdf/download"),
            import("@/lib/pdf/admin-report"),
            getAdminAnalytics(),
          ]);
        const filename = pdfFilename({
          title: "Salebiz platform analytics",
          suffix: new Date().toISOString().slice(0, 10),
        });
        await downloadPdf(
          <AdminAnalyticsReport data={data} sections={sections} />,
          filename,
        );
        toast.success(`Saved ${filename}`);
      }}
    />
  );
}
