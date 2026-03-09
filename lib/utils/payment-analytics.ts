import type { Payment } from "@/lib/types/payments";
import type {
  PaymentSummary,
  RevenueTimePoint,
  StatusDistribution,
  ProductRevenue,
} from "@/lib/types/payment-analytics";

/** Compute summary stats from a list of payments. */
export function computePaymentSummary(payments: Payment[]): PaymentSummary {
  const paidPayments = payments.filter((p) => p.status === "paid");
  const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  return {
    totalRevenue,
    totalTransactions: payments.length,
    paidCount: paidPayments.length,
    pendingCount: payments.filter((p) => p.status === "pending").length,
    invoicedCount: payments.filter((p) => p.status === "invoiced").length,
    approvedCount: payments.filter((p) => p.status === "approved").length,
    averageValue: paidPayments.length > 0 ? Math.round(totalRevenue / paidPayments.length) : 0,
    currency: "aud",
  };
}

/** Compute revenue time series grouped by month. */
export function computeRevenueTimeSeries(payments: Payment[]): RevenueTimePoint[] {
  const paidPayments = payments.filter((p) => p.status === "paid" && p.paid_at);
  const map = new Map<string, { revenue: number; count: number }>();

  for (const p of paidPayments) {
    const d = new Date(p.paid_at!);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = map.get(key) ?? { revenue: 0, count: 0 };
    existing.revenue += p.amount;
    existing.count += 1;
    map.set(key, existing);
  }

  const keys = Array.from(map.keys()).sort();
  if (keys.length === 0) return [];

  const result: RevenueTimePoint[] = [];
  const [startYear, startMonth] = keys[0].split("-").map(Number);
  const [endYear, endMonth] = keys[keys.length - 1].split("-").map(Number);

  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const entry = map.get(key);
    result.push({ date: key, revenue: entry?.revenue ?? 0, count: entry?.count ?? 0 });
    m++;
    if (m > 12) { m = 1; y++; }
  }

  return result;
}

/** Compute status distribution. */
export function computeStatusDistribution(payments: Payment[]): StatusDistribution[] {
  const map = new Map<string, { count: number; amount: number }>();
  for (const p of payments) {
    const existing = map.get(p.status) ?? { count: 0, amount: 0 };
    existing.count += 1;
    existing.amount += p.amount;
    map.set(p.status, existing);
  }
  return Array.from(map.entries()).map(([status, { count, amount }]) => ({
    status,
    count,
    amount,
  }));
}

/** Compute revenue by product. */
export function computeProductRevenue(payments: Payment[]): ProductRevenue[] {
  const paidPayments = payments.filter((p) => p.status === "paid");
  const map = new Map<string, { revenue: number; count: number }>();

  for (const p of paidPayments) {
    const prod = Array.isArray(p.product) ? p.product[0] : p.product;
    const name = prod?.name ?? `${p.package_days} days`;
    const existing = map.get(name) ?? { revenue: 0, count: 0 };
    existing.revenue += p.amount;
    existing.count += 1;
    map.set(name, existing);
  }

  return Array.from(map.entries())
    .map(([name, { revenue, count }]) => ({ name, revenue, count }))
    .sort((a, b) => b.revenue - a.revenue);
}
