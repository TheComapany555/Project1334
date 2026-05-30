// Shared PDF primitives for analytics reports (Feature #5).
//
// All components use @react-pdf/renderer's React-like primitives — these are
// NOT the same as DOM React. <Text> can only contain inline text; <View> is a
// flex container; <Page>, <Document>, <Svg> are pdf-specific. Layout uses
// flexbox-lite (no grid).

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { PDF_COLORS, PDF_FONT_SIZES, PDF_SPACING } from "@/lib/pdf/theme";

export { Document, Page, View, Text, StyleSheet };

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

export const styles = StyleSheet.create({
  page: {
    paddingTop: PDF_SPACING.pageMargin + 18,
    paddingBottom: PDF_SPACING.pageMargin + 24,
    paddingHorizontal: PDF_SPACING.pageMargin,
    fontFamily: "Helvetica",
    color: PDF_COLORS.text,
    fontSize: PDF_FONT_SIZES.body,
    lineHeight: 1.45,
  },

  // Page header — appears on every non-cover page
  pageHeader: {
    position: "absolute",
    top: 18,
    left: PDF_SPACING.pageMargin,
    right: PDF_SPACING.pageMargin,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.divider,
  },
  pageHeaderBrand: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.brand,
  },
  pageHeaderMeta: {
    fontSize: PDF_FONT_SIZES.small,
    color: PDF_COLORS.textMuted,
  },

  // Page footer (page numbers)
  pageFooter: {
    position: "absolute",
    bottom: 18,
    left: PDF_SPACING.pageMargin,
    right: PDF_SPACING.pageMargin,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: PDF_FONT_SIZES.small,
    color: PDF_COLORS.textFaint,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.divider,
  },

  // Cover page
  coverWrap: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    paddingVertical: 36,
  },
  coverAccent: {
    width: 60,
    height: 4,
    backgroundColor: PDF_COLORS.brand,
    marginBottom: 24,
  },
  coverBrand: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.brand,
  },
  coverTagline: {
    fontSize: 11,
    color: PDF_COLORS.textMuted,
    marginTop: 4,
  },
  coverTitle: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.text,
    marginTop: 24,
  },
  coverSubtitle: {
    fontSize: 14,
    color: PDF_COLORS.textMuted,
    marginTop: 8,
  },
  coverMetaTable: {
    flexDirection: "column",
    marginTop: 28,
  },
  coverMetaRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.divider,
  },
  coverMetaLabel: {
    width: 120,
    fontSize: 10,
    color: PDF_COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  coverMetaValue: {
    flex: 1,
    fontSize: 12,
    color: PDF_COLORS.text,
  },
  coverFooter: {
    fontSize: 9,
    color: PDF_COLORS.textFaint,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.divider,
    paddingTop: 10,
  },

  // Section
  section: {
    marginBottom: PDF_SPACING.sectionGap,
  },
  sectionTitle: {
    fontSize: PDF_FONT_SIZES.sectionTitle,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: PDF_FONT_SIZES.small,
    color: PDF_COLORS.textMuted,
    marginBottom: 10,
  },

  // KPI grid (3 columns)
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    marginHorizontal: -4,
  },
  kpiCell: {
    width: "33.333%",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  kpiCellInner: {
    borderWidth: 1,
    borderColor: PDF_COLORS.divider,
    borderRadius: 4,
    padding: 10,
    backgroundColor: "#ffffff",
  },
  kpiLabel: {
    fontSize: PDF_FONT_SIZES.kpiLabel,
    color: PDF_COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: PDF_FONT_SIZES.kpiValue,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.text,
  },
  kpiDelta: {
    marginTop: 3,
    fontSize: PDF_FONT_SIZES.small,
  },
  kpiDeltaPositive: { color: PDF_COLORS.positive },
  kpiDeltaNegative: { color: PDF_COLORS.negative },
  kpiDeltaNeutral: { color: PDF_COLORS.textFaint },

  // Tables
  table: {
    borderWidth: 1,
    borderColor: PDF_COLORS.divider,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeadRow: {
    flexDirection: "row",
    backgroundColor: PDF_COLORS.brandSoft,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeadCell: {
    fontSize: PDF_FONT_SIZES.tableHead,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.brand,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.divider,
  },
  tableRowAlt: {
    backgroundColor: PDF_COLORS.rowAlt,
  },
  tableCell: {
    fontSize: PDF_FONT_SIZES.tableCell,
    color: PDF_COLORS.text,
  },
  tableCellMuted: {
    fontSize: PDF_FONT_SIZES.tableCell,
    color: PDF_COLORS.textMuted,
  },

  // Empty state inside a section
  empty: {
    paddingVertical: 16,
    fontSize: PDF_FONT_SIZES.small,
    color: PDF_COLORS.textFaint,
    fontStyle: "italic",
    textAlign: "center",
    borderWidth: 1,
    borderColor: PDF_COLORS.divider,
    borderStyle: "dashed",
    borderRadius: 4,
  },

  // Sparkline bar
  bar: {
    height: 10,
    backgroundColor: PDF_COLORS.brandSoft,
    overflow: "hidden",
    borderRadius: 2,
  },
  barFill: {
    height: "100%",
    backgroundColor: PDF_COLORS.brand,
  },
});

/* ------------------------------------------------------------------ */
/*  Components                                                          */
/* ------------------------------------------------------------------ */

export type CoverPageMeta = {
  /** "Field" → "Value" rows printed on the cover page (e.g. Report owner, Period). */
  label: string;
  value: string;
}[];

export function CoverPage({
  title,
  subtitle,
  meta,
  generatedAt,
}: {
  title: string;
  subtitle?: string;
  meta: CoverPageMeta;
  generatedAt: Date;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.coverWrap}>
        <View>
          <View style={styles.coverAccent} />
          <Text style={styles.coverBrand}>Salebiz</Text>
          <Text style={styles.coverTagline}>
            Australia&apos;s Business Marketplace
          </Text>
        </View>

        <View>
          <Text style={styles.coverTitle}>{title}</Text>
          {subtitle ? <Text style={styles.coverSubtitle}>{subtitle}</Text> : null}

          <View style={styles.coverMetaTable}>
            {meta.map((row) => (
              <View key={row.label} style={styles.coverMetaRow}>
                <Text style={styles.coverMetaLabel}>{row.label}</Text>
                <Text style={styles.coverMetaValue}>{row.value || "—"}</Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.coverFooter}>
            Generated {formatTimestamp(generatedAt)} · This report is
            confidential and intended only for the named recipient.
          </Text>
        </View>
      </View>
    </Page>
  );
}

/**
 * Body page wrapper — applies the standard header (brand + report title) and
 * footer (page X of Y). Use this instead of <Page> for every non-cover page.
 */
export function ReportPage({
  reportTitle,
  reportSubtitle,
  children,
}: {
  reportTitle: string;
  reportSubtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Page size="A4" style={styles.page} wrap>
      <View style={styles.pageHeader} fixed>
        <Text style={styles.pageHeaderBrand}>Salebiz</Text>
        <Text style={styles.pageHeaderMeta}>
          {reportTitle}
          {reportSubtitle ? ` · ${reportSubtitle}` : ""}
        </Text>
      </View>

      {children}

      <View style={styles.pageFooter} fixed>
        <Text>salebiz.com.au</Text>
        <Text
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      </View>
    </Page>
  );
}

export function Section({
  title,
  subtitle,
  children,
  break: pageBreak = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Force this section onto a new page. */
  break?: boolean;
}) {
  return (
    <View style={styles.section} break={pageBreak} wrap={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export type KpiItem = {
  label: string;
  value: string;
  delta?: { value: number; suffix?: string } | null;
};

export function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <View style={styles.kpiGrid}>
      {items.map((item) => (
        <View key={item.label} style={styles.kpiCell}>
          <View style={styles.kpiCellInner}>
            <Text style={styles.kpiLabel}>{item.label}</Text>
            <Text style={styles.kpiValue}>{item.value}</Text>
            {item.delta ? (
              <Text
                style={[
                  styles.kpiDelta,
                  item.delta.value > 0
                    ? styles.kpiDeltaPositive
                    : item.delta.value < 0
                      ? styles.kpiDeltaNegative
                      : styles.kpiDeltaNeutral,
                ]}
              >
                {item.delta.value > 0 ? "▲" : item.delta.value < 0 ? "▼" : "—"}{" "}
                {Math.abs(item.delta.value).toFixed(1)}
                {item.delta.suffix ?? "%"}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export type DataTableColumn<T> = {
  header: string;
  /** CSS-style width, e.g. "30%" or 80 (points). Defaults to flex:1. */
  width?: string | number;
  /** Render the cell as plain text — receives the row, returns string. */
  cell: (row: T) => string;
  /** Optional alignment override. */
  align?: "left" | "right" | "center";
};

export function DataTable<T>({
  columns,
  rows,
  emptyMessage = "No data for the selected period.",
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <Text style={styles.empty}>{emptyMessage}</Text>;
  }

  return (
    <View style={styles.table}>
      <View style={styles.tableHeadRow}>
        {columns.map((col) => (
          <Text
            key={col.header}
            style={[
              styles.tableHeadCell,
              cellWidthStyle(col.width),
              alignStyle(col.align),
            ]}
          >
            {col.header}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View
          key={i}
          style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
          wrap={false}
        >
          {columns.map((col) => (
            <Text
              key={col.header}
              style={[
                styles.tableCell,
                cellWidthStyle(col.width),
                alignStyle(col.align),
              ]}
            >
              {col.cell(row)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function cellWidthStyle(width: string | number | undefined) {
  if (width == null) return { flex: 1 };
  return typeof width === "number" ? { width } : { width };
}

function alignStyle(align?: "left" | "right" | "center") {
  if (!align || align === "left") return {};
  return { textAlign: align };
}

export function formatTimestamp(d: Date): string {
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-AU").format(n);
}

export function formatCurrencyCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return `${value.toFixed(decimals)}%`;
}

export function formatRate01(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}
