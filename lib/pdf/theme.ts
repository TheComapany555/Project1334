// Feature #5: shared visual constants for analytics PDF reports.
// Colors here are tuned for print contrast (lower-saturation greens than the
// app's web theme so they don't blow out on inkjet).

export const PDF_COLORS = {
  brand: "#0d5c2f",
  brandSoft: "#e8f1ec",
  text: "#1a1a1a",
  textMuted: "#5a6166",
  textFaint: "#8a8e93",
  divider: "#e1e4e7",
  rowAlt: "#f6f8f9",
  positive: "#067a44",
  negative: "#b32d2d",
  warning: "#b8730a",
} as const;

export const PDF_SPACING = {
  pageMargin: 36, // ~0.5 inch
  sectionGap: 18,
  rowGap: 6,
} as const;

export const PDF_FONT_SIZES = {
  pageTitle: 24,
  sectionTitle: 14,
  kpiLabel: 9,
  kpiValue: 16,
  body: 10,
  small: 8,
  tableHead: 8,
  tableCell: 9,
} as const;
