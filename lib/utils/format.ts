/**
 * Shared formatting helpers used by admin analytics + other dashboards.
 */

export function formatCurrencyAUD(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** YYYY-MM (UTC) -> "Jan 26" */
export function formatMonthShort(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-AU", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

/** Percentage change between two numbers, returning a finite number or null. */
export function percentChange(
  current: number,
  previous: number
): { value: number; direction: "up" | "down" | "flat" } | null {
  if (!previous) {
    if (current > 0) return { value: 100, direction: "up" };
    return null;
  }
  const value = ((current - previous) / previous) * 100;
  if (!Number.isFinite(value)) return null;
  if (Math.abs(value) < 0.5) return { value: 0, direction: "flat" };
  return {
    value: Math.abs(value),
    direction: value > 0 ? "up" : "down",
  };
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`;
}
