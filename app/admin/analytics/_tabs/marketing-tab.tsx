import { Tag } from "lucide-react";
import type { AdminAnalytics } from "@/lib/types/admin-analytics";
import { KpiCard } from "@/components/admin/analytics/kpi-card";
import { TableSection } from "@/components/admin/analytics/table-section";
import { DiscountCodesRedemptionsTable } from "../_tables/discount-codes-redemptions-table";
import { AdsPerformanceTable } from "../_tables/ads-performance-table";
import {
  formatCompactNumber,
  formatCurrencyAUD,
  formatPercent,
} from "@/lib/utils/format";

export function MarketingTab({ analytics }: { analytics: AdminAnalytics }) {
  const { kpis, charts } = analytics;

  const totalImpressions = charts.adsByPlacement.reduce(
    (s, r) => s + r.impressions,
    0,
  );
  const totalClicks = charts.adsByPlacement.reduce((s, r) => s + r.clicks, 0);
  const overallCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const totalActiveAds = charts.adsByPlacement.reduce(
    (s, r) => s + r.activeAds,
    0,
  );

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Promo redemptions"
          value={kpis.totalDiscountRedemptions.toLocaleString("en-AU")}
          subValue="All time"
          icon={<Tag className="h-4 w-4" />}
          tone="emerald"
        />
        <KpiCard
          label="Discounts given"
          value={formatCurrencyAUD(kpis.totalDiscountSavings)}
          subValue="Total customer savings"
          icon={<Tag className="h-4 w-4" />}
          tone="emerald"
        />
        <KpiCard
          label="Active ads"
          value={String(totalActiveAds)}
          subValue={`${formatCompactNumber(totalImpressions)} impressions`}
          icon={<Tag className="h-4 w-4" />}
          tone="primary"
        />
        <KpiCard
          label="Overall CTR"
          value={formatPercent(overallCtr * 100, 2)}
          subValue={`${formatCompactNumber(totalClicks)} clicks total`}
          icon={<Tag className="h-4 w-4" />}
        />
      </section>

      <TableSection
        title="Discount code redemptions"
        description="Active codes ranked by usage. Sortable by discount %, redemptions, or limit. Search by code."
      >
        <DiscountCodesRedemptionsTable data={charts.topDiscountCodes} />
      </TableSection>

      <TableSection
        title="Advertising performance"
        description="Active ads, impressions and click-through rate by placement. Filter by placement or sort by CTR."
      >
        <AdsPerformanceTable data={charts.adsByPlacement} />
      </TableSection>
    </div>
  );
}
