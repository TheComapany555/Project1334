/**
 * Recharts color palette using CSS variables so charts respect light/dark theme.
 * Use these in Recharts components for consistent, theme-aware colors.
 */
export const CHART_COLORS = {
  /** Green – primary/success (e.g. published, active) */
  primary: "var(--chart-1)",
  /** Blue – info (e.g. enquiries, listings) */
  info: "var(--chart-2)",
  /** Amber – warning (e.g. draft, pending) */
  warning: "var(--chart-3)",
  /** Purple – secondary (e.g. other, disabled) */
  purple: "var(--chart-4)",
  /** Muted/coral (e.g. older, removed) */
  muted: "var(--chart-5)",
} as const;

/** Ordered list for multi-series (e.g. stacked bars). */
export const CHART_COLOR_LIST = [
  CHART_COLORS.primary,
  CHART_COLORS.info,
  CHART_COLORS.warning,
  CHART_COLORS.purple,
  CHART_COLORS.muted,
] as const;

/** Default height for bar/area charts so the chart area is prominent. */
export const CHART_BAR_HEIGHT = 260;

/** Min height for donut cards; donut is large and centered. */
export const CHART_DONUT_HEIGHT = 280;

/** Size of the donut chart (width/height) so it appears big and centered. */
export const CHART_DONUT_SIZE = 200;
