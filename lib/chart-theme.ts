/**
 * Single source of truth for chart styling.
 *
 * Colours are theme-aware CSS variables (`--chart-1..5`, defined in
 * `app/globals.css`) so light/dark modes swap automatically. The five slots are
 * a **validated, CVD-safe categorical palette** — green (brand) → blue → amber
 * → violet → magenta — and are assigned in **fixed order**. Never cycle a 6th
 * hue; fold extra series into an "Other" bucket.
 *
 * Every chart pulls its grid / axis / bar / tooltip look from this module so
 * the whole app reads as one system.
 */

// ── Palette ──────────────────────────────────────────────────────────────────

export const CHART_COLORS = {
  /** slot 1 — brand green */
  primary: "var(--chart-1)",
  /** slot 2 — blue */
  info: "var(--chart-2)",
  /** slot 3 — amber */
  warning: "var(--chart-3)",
  /** slot 4 — violet */
  purple: "var(--chart-4)",
  /** slot 5 — magenta */
  muted: "var(--chart-5)",
} as const;

/** Fixed categorical order for multi-series charts. Never cycle past slot 5. */
export const CHART_SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/** @deprecated kept for back-compat — use {@link CHART_SERIES}. */
export const CHART_COLOR_LIST = CHART_SERIES;

/** Pick a categorical colour by index, in fixed order (wraps at the palette end). */
export function chartColor(index: number): string {
  return CHART_SERIES[index % CHART_SERIES.length];
}

// ── Shared mark / chrome specs (keep every chart visually identical) ──────────

/**
 * Recessive hairline grid — solid, one-step-off-surface. Never dashed.
 * Spread onto <CartesianGrid> alongside `vertical={false}` (columns) or
 * `horizontal={false}` (horizontal bars).
 */
export const CHART_GRID = {
  stroke: "var(--border)",
  strokeOpacity: 1,
} as const;

/** Axis tick text: muted, 11px. Pair with `tickLine={false} axisLine={false}`. */
export const CHART_TICK = { fontSize: 11, fill: "var(--muted-foreground)" } as const;

/** Rounded data-end for columns (top corners). */
export const BAR_RADIUS_TOP = [4, 4, 0, 0] as [number, number, number, number];

/** Rounded data-end for horizontal bars (right corners). */
export const BAR_RADIUS_RIGHT = [0, 4, 4, 0] as [number, number, number, number];

/** Cap bar thickness so a mark never fills its whole slot. */
export const BAR_MAX_SIZE = 32;

/** Surface-coloured hover wash behind the hovered bar. */
export const BAR_CURSOR = { fill: "var(--muted)", opacity: 0.35 } as const;

/**
 * 2px surface-coloured separation between touching marks (stacked-bar segments,
 * pie/donut slices). Reads as the background showing through — not a border.
 */
export const SURFACE_GAP = { stroke: "var(--card)", strokeWidth: 2 } as const;

// ── Sizes ─────────────────────────────────────────────────────────────────────

/** Default height for bar/area charts so the plot area stays prominent. */
export const CHART_BAR_HEIGHT = 260;

/** Min height for donut cards; the donut is large and centered. */
export const CHART_DONUT_HEIGHT = 280;

/** Size (width/height) of the donut chart so it appears big and centered. */
export const CHART_DONUT_SIZE = 200;
