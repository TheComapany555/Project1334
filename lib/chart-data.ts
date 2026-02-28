import type { ListingsChartDataPoint } from "@/components/dashboard/chart-line-listings";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function buildListingsChartData(
  listings: { created_at: string; status: string }[]
): ListingsChartDataPoint[] {
  const now = new Date();
  const points: ListingsChartDataPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const added = listings.filter((l) => {
      const created = new Date(l.created_at);
      return created >= d && created < nextMonth;
    }).length;
    const published = listings.filter((l) => {
      const created = new Date(l.created_at);
      return created >= d && created < nextMonth && l.status === "published";
    }).length;
    const draft = listings.filter((l) => {
      const created = new Date(l.created_at);
      return created >= d && created < nextMonth && l.status === "draft";
    }).length;
    const other = added - published - draft;
    points.push({
      month: MONTH_NAMES[d.getMonth()],
      added,
      published,
      draft,
      other,
    });
  }
  return points;
}

export type EnquiriesChartDataPoint = { month: string; enquiries: number };

export function buildEnquiriesChartData(
  enquiries: { created_at: string }[]
): EnquiriesChartDataPoint[] {
  const now = new Date();
  const points: EnquiriesChartDataPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const count = enquiries.filter((e) => {
      const created = new Date(e.created_at);
      return created >= d && created < nextMonth;
    }).length;
    points.push({ month: MONTH_NAMES[d.getMonth()], enquiries: count });
  }
  return points;
}
